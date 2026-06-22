<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\User;
use App\Models\UserStoreDiscount;

class StorePricingService
{
    public function activeDiscountFor(User $user, ?int $planId = null): ?UserStoreDiscount
    {
        return UserStoreDiscount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();
    }

    /**
     * @return array{
     *     subtotal: float,
     *     discount_percent: int,
     *     discount_amount: float,
     *     total: float,
     *     is_free: bool,
     *     has_discount: bool,
     *     label: string|null,
     *     user_store_discount_id: int|null
     * }
     */
    public function quote(User $user, float $pricePerDay, int $dayCount, ?int $planId = null): array
    {
        $dayCount = max(0, $dayCount);
        $subtotal = round($dayCount * max(0, $pricePerDay), 2);
        $discount = $this->activeDiscountFor($user, $planId);

        if (! $discount || $subtotal <= 0) {
            return [
                'subtotal' => $subtotal,
                'discount_percent' => 0,
                'discount_amount' => 0.0,
                'total' => $subtotal,
                'is_free' => false,
                'has_discount' => false,
                'label' => null,
                'user_store_discount_id' => null,
            ];
        }

        $percent = max(0, min(100, (int) $discount->discount_percent));
        $discountAmount = round($subtotal * ($percent / 100), 2);
        $total = max(0, round($subtotal - $discountAmount, 2));
        $isFree = $percent >= 100 || $total <= 0;

        return [
            'subtotal' => $subtotal,
            'discount_percent' => $percent,
            'discount_amount' => $discountAmount,
            'total' => $total,
            'is_free' => $isFree,
            'has_discount' => $percent > 0,
            'label' => $isFree
                ? 'Compra gratis (beneficio del entrenador)'
                : ($percent.'% de descuento'),
            'user_store_discount_id' => $discount->id,
        ];
    }

    public function summaryForUser(User $user, ?int $planId = null): array
    {
        $discount = $this->activeDiscountFor($user, $planId);

        if (! $discount) {
            return [
                'has_discount' => false,
                'discount_percent' => 0,
                'is_free' => false,
                'plan_id' => null,
                'plan_name' => null,
                'label' => null,
            ];
        }

        $percent = max(0, min(100, (int) $discount->discount_percent));
        $plan = $discount->plan_id ? Plan::query()->find($discount->plan_id) : null;

        return [
            'has_discount' => $percent > 0,
            'discount_percent' => $percent,
            'is_free' => $percent >= 100,
            'plan_id' => $discount->plan_id,
            'plan_name' => $plan?->name,
            'label' => $percent >= 100
                ? 'Tienes compras gratis en la tienda'
                : ('Tienes '.$percent.'% de descuento en la tienda'),
        ];
    }

    public function paymentMetaFromQuote(array $quote): array
    {
        if (! ($quote['has_discount'] ?? false)) {
            return [];
        }

        return [
            'store_discount' => [
                'id' => $quote['user_store_discount_id'] ?? null,
                'percent' => $quote['discount_percent'] ?? 0,
                'subtotal' => $quote['subtotal'] ?? 0,
                'discount_amount' => $quote['discount_amount'] ?? 0,
                'total' => $quote['total'] ?? 0,
            ],
        ];
    }
}
