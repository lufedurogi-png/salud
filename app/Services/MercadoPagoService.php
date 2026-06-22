<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class MercadoPagoService
{
    private const BASE_URL = 'https://api.mercadopago.com';

    private const CONNECT_TIMEOUT_SECONDS = 15;

    private const REQUEST_TIMEOUT_SECONDS = 45;

    private const RETRY_TIMES = 2;

    private const RETRY_SLEEP_MS = 500;

    private function accessToken(): string
    {
        $t = trim((string) config('services.mercadopago.access_token', ''));

        return $t;
    }

    public function isConfigured(): bool
    {
        return $this->accessToken() !== '';
    }

    /** Credenciales TEST- usan URL sandbox del checkout. */
    public function isTestCredentials(): bool
    {
        return str_starts_with($this->accessToken(), 'TEST-');
    }

    /**
     * Con `auto_return`, Mercado Pago valida la URL de éxito: HTTP o localhost suelen provocar
     * 400 `invalid_auto_return` / `back_url.success must be defined`.
     */
    public static function canUseMercadoPagoAutoReturn(string $successUrl): bool
    {
        if (filter_var($successUrl, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $lower = strtolower($successUrl);

        if (! str_starts_with($lower, 'https://')) {
            return false;
        }

        return ! str_contains($lower, 'localhost')
            && ! str_contains($lower, '127.0.0.1');
    }

    /**
     * Mercado Pago rechaza notification_url con localhost, HTTP o IP no públicas.
     * En local: omitir o definir MERCADOPAGO_NOTIFICATION_URL (HTTPS público, ej. ngrok).
     */
    public static function mercadoPagoNotificationUrlForPreference(): ?string
    {
        $explicit = trim((string) config('services.mercadopago.notification_url', ''));
        if ($explicit !== '' && filter_var($explicit, FILTER_VALIDATE_URL)) {
            $e = strtolower($explicit);

            return str_starts_with($e, 'https://') ? $explicit : null;
        }

        $base = rtrim((string) config('app.url'), '/');
        if ($base === '') {
            return null;
        }

        $full = $base.'/api/v1/mercadopago/webhook';
        if (filter_var($full, FILTER_VALIDATE_URL) === false) {
            return null;
        }

        $lower = strtolower($full);
        if (! str_starts_with($lower, 'https://')) {
            return null;
        }

        $host = parse_url($full, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return null;
        }

        $hostLower = strtolower($host);
        if ($hostLower === 'localhost'
            || $hostLower === '127.0.0.1'
            || str_starts_with($hostLower, '192.168.')
            || str_starts_with($hostLower, '10.')
        ) {
            return null;
        }

        if (preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $hostLower) === 1) {
            return null;
        }

        return $full;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function createPreference(array $payload): array
    {
        $res = Http::withToken($this->accessToken())
            ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout(self::REQUEST_TIMEOUT_SECONDS)
            ->retry(self::RETRY_TIMES, self::RETRY_SLEEP_MS)
            ->acceptJson()
            ->post(self::BASE_URL.'/checkout/preferences', $payload);

        if (! $res->successful()) {
            Log::warning('Mercado Pago create preference error', ['body' => $res->body()]);
            throw new RuntimeException('Mercado Pago rechazó crear la preferencia de pago.');
        }

        /** @var array<string, mixed> $json */
        $json = $res->json();

        return $json;
    }

    /**
     * @return array<string, mixed>
     */
    public function getPayment(string $paymentId): array
    {
        $res = Http::withToken($this->accessToken())
            ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout(self::REQUEST_TIMEOUT_SECONDS)
            ->retry(self::RETRY_TIMES, self::RETRY_SLEEP_MS)
            ->acceptJson()
            ->get(self::BASE_URL.'/v1/payments/'.rawurlencode($paymentId));

        if (! $res->successful()) {
            Log::warning('Mercado Pago get payment error', ['id' => $paymentId, 'body' => $res->body()]);
            throw new RuntimeException('No se pudo consultar el pago en Mercado Pago.');
        }

        /** @var array<string, mixed> $json */
        $json = $res->json();

        return $json;
    }

    /**
     * URL de checkout.
     * Con credenciales TEST-, la API devuelve init_point y sandbox_init_point.
     */
    public static function checkoutUrl(array $preferenceResponse, bool $testCredentials): ?string
    {
        if ($testCredentials) {
            $init = $preferenceResponse['init_point'] ?? null;
            $sandbox = $preferenceResponse['sandbox_init_point'] ?? null;
            foreach ([$init, $sandbox] as $u) {
                if (is_string($u) && $u !== '') {
                    return $u;
                }
            }

            return null;
        }

        $u = $preferenceResponse['init_point'] ?? null;

        return is_string($u) && $u !== '' ? $u : null;
    }
}
