<?php

namespace App\Support;

use App\Models\PaymentMethodSetting;

class MetodoPagoToggle
{
    private const METHODS = [
        'paypal' => [
            'label' => 'PayPal',
            'description' => 'Pago redirigido a la pasarela de PayPal.',
        ],
        'mercadopago' => [
            'label' => 'Mercado Pago',
            'description' => 'Pago redirigido a Checkout Pro de Mercado Pago.',
        ],
        'tarjeta' => [
            'label' => 'Tarjeta de crédito o débito',
            'description' => 'Cobro directo en tu checkout con tarjeta guardada (simulación sin pasarela, como en api-ejemplo).',
        ],
    ];

    public static function exists(string $code): bool
    {
        return array_key_exists($code, self::METHODS);
    }

    public static function flags(): array
    {
        $rows = PaymentMethodSetting::query()
            ->whereIn('code', array_keys(self::METHODS))
            ->get()
            ->keyBy('code');

        $out = [];
        foreach (array_keys(self::METHODS) as $code) {
            $out[$code] = (bool) ($rows[$code]->active ?? true);
        }

        return $out;
    }

    public static function isEnabled(string $code): bool
    {
        $flags = self::flags();

        return $flags[$code] ?? true;
    }

    public static function listForAdmin(): array
    {
        $flags = self::flags();
        $out = [];
        foreach (self::METHODS as $code => $meta) {
            $out[] = [
                'code' => $code,
                'label' => $meta['label'],
                'description' => $meta['description'],
                'active' => (bool) ($flags[$code] ?? true),
            ];
        }

        return $out;
    }

    public static function set(string $code, bool $active, ?int $updatedBy = null): void
    {
        PaymentMethodSetting::query()->updateOrCreate(
            ['code' => $code],
            ['active' => $active, 'updated_by_user_id' => $updatedBy],
        );
    }
}

