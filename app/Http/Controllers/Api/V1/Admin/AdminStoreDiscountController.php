<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\User;
use App\Models\UserStoreDiscount;
use Illuminate\Http\Request;

class AdminStoreDiscountController extends Controller
{
    public function searchClients(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $like = '%'.$q.'%';
        $clients = User::query()
            ->where('tipo', 2)
            ->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('alias', 'like', $like);
            })
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'last_name', 'email', 'alias']);

        $discounts = UserStoreDiscount::query()
            ->whereIn('user_id', $clients->pluck('id'))
            ->get()
            ->keyBy('user_id');

        $data = $clients->map(function (User $user) use ($discounts) {
            $discount = $discounts->get($user->id);

            return [
                'id' => $user->id,
                'name' => $user->name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'alias' => $user->alias,
                'display_name' => trim($user->alias ?: ($user->name.' '.$user->last_name)),
                'discount' => $discount ? $this->mapDiscount($discount) : null,
            ];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function show(int $userId)
    {
        $user = User::query()->where('tipo', 2)->findOrFail($userId);
        $discount = UserStoreDiscount::query()->where('user_id', $userId)->first();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'alias' => $user->alias,
                    'display_name' => trim($user->alias ?: ($user->name.' '.$user->last_name)),
                ],
                'discount' => $discount ? $this->mapDiscount($discount) : null,
                'plans' => Plan::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'is_specialized']),
            ],
        ]);
    }

    public function upsert(Request $request, int $userId)
    {
        User::query()->where('tipo', 2)->findOrFail($userId);

        $data = $request->validate([
            'discount_percent' => 'required|integer|min:0|max:100',
            'plan_id' => 'nullable|exists:plans,id',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        $discount = UserStoreDiscount::query()->updateOrCreate(
            ['user_id' => $userId],
            [
                'plan_id' => $data['plan_id'] ?? null,
                'discount_percent' => (int) $data['discount_percent'],
                'is_active' => (bool) ($data['is_active'] ?? true),
                'notes' => $data['notes'] ?? null,
                'created_by_user_id' => $request->user()->id,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Descuento guardado.',
            'data' => $this->mapDiscount($discount->fresh(['plan'])),
        ]);
    }

    public function destroy(int $userId)
    {
        UserStoreDiscount::query()->where('user_id', $userId)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Descuento eliminado.',
        ]);
    }

    private function mapDiscount(UserStoreDiscount $discount): array
    {
        $discount->loadMissing('plan');

        return [
            'id' => $discount->id,
            'user_id' => $discount->user_id,
            'plan_id' => $discount->plan_id,
            'plan_name' => $discount->plan?->name,
            'discount_percent' => (int) $discount->discount_percent,
            'is_active' => (bool) $discount->is_active,
            'is_free' => $discount->isFree(),
            'notes' => $discount->notes,
            'updated_at' => optional($discount->updated_at)->toIso8601String(),
        ];
    }
}
