<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Models\MercadoPagoPreferenceSnapshot;
use App\Models\PayPalOrderSnapshot;
use App\Models\Plan;
use App\Models\UserPlanSubscription;
use App\Services\MercadoPagoService;
use App\Services\PayPalService;
use App\Services\StorePricingService;
use App\Support\MetodoPagoToggle;
use App\Support\PaidDaySlots;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class ClientCheckoutController extends Controller
{
    private const SNAPSHOT_TTL_MINUTES = 120;

    public function __construct(
        private readonly PayPalService $payPal,
        private readonly MercadoPagoService $mercadoPago,
        private readonly StorePricingService $pricing,
    ) {}

    public function createCheckout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'days_per_week' => 'required|integer|min:1|max:7',
            'paid_days' => 'nullable|array',
            'paid_days.*' => 'integer|min:0|max:6',
            'paid_day_slots' => 'nullable|array',
            'paid_day_slots.*.weekday' => 'required_with:paid_day_slots|integer|min:0|max:6',
            'paid_day_slots.*.date' => 'required_with:paid_day_slots|date_format:Y-m-d',
            'method' => 'required|in:tarjeta,paypal,mercadopago,gratis',
            'return_url' => 'nullable|string|max:2048',
            'cancel_url' => 'nullable|string|max:2048',
            'tarjeta' => 'nullable|array',
            'tarjeta.numero' => 'nullable|string|max:22',
            'tarjeta.titular' => 'nullable|string|max:120',
        ]);

        if ($data['method'] !== 'gratis' && ! MetodoPagoToggle::isEnabled($data['method'])) {
            return response()->json([
                'success' => false,
                'message' => 'Este método de pago está temporalmente desactivado.',
            ], 422);
        }

        $plan = Plan::query()->findOrFail((int) $data['plan_id']);
        $daysPerWeek = (int) $data['days_per_week'];
        $startsAt = now()->toDateString();
        $endsAt = now()->addMonth()->toDateString();

        if (! empty($data['paid_day_slots'])) {
            $paidDaySlots = PaidDaySlots::normalizeClientSlots($data['paid_day_slots']);
            $paidDays = PaidDaySlots::weekdaysFromSlots($paidDaySlots);

            if ($paidDaySlots === []) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selecciona al menos una fecha válida en el mes.',
                ], 422);
            }

            if (count($paidDays) < $daysPerWeek) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes incluir al menos '.$daysPerWeek.' día(s) distintos de la semana.',
                ], 422);
            }
        } else {
            $paidDays = PaidDaySlots::normalizeWeekdays($data['paid_days'] ?? []);

            if (count($paidDays) !== $daysPerWeek) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes elegir exactamente '.$daysPerWeek.' día(s) de entrenamiento.',
                ], 422);
            }

            $paidDaySlots = PaidDaySlots::buildForPeriod($paidDays, $startsAt, $endsAt);
        }

        $user = $request->user();
        $pricing = $this->pricing->quote(
            $user,
            (float) $plan->price_per_day,
            count($paidDaySlots),
            (int) $plan->id
        );
        $pricingError = $this->validateCheckoutMethod($data['method'], $pricing);
        if ($pricingError) {
            return $pricingError;
        }
        $total = (float) $pricing['total'];

        $subscription = UserPlanSubscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'days_per_week' => count($paidDays),
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'paid_days' => $paidDays,
            'paid_day_slots' => $paidDaySlots,
            'payment_method' => $data['method'],
            'payment_status' => in_array($data['method'], ['tarjeta', 'gratis'], true) ? 'paid' : 'pending',
            'is_active' => false,
        ]);

        if ($data['method'] === 'gratis') {
            $paymentMeta = array_merge(
                $this->pricing->paymentMetaFromQuote($pricing),
                [
                    'origen' => 'checkout_tienda_gratis',
                    'nota' => 'Compra sin cargo — beneficio del entrenador.',
                ]
            );
            $reference = 'GRATIS-'.strtoupper(substr(md5((string) $subscription->id.microtime(true)), 0, 12));
            $this->activateSubscription($user->id, $subscription->id, $reference, 'gratis', $paymentMeta);

            return response()->json([
                'success' => true,
                'message' => 'Plan activado sin costo.',
                'data' => [
                    'status' => 'paid',
                    'subscription_id' => $subscription->id,
                    'pricing' => $pricing,
                ],
            ]);
        }

        if ($data['method'] === 'tarjeta') {
            $card = $data['tarjeta'] ?? [];
            $digits = preg_replace('/\D/', '', (string) ($card['numero'] ?? ''));
            $last4 = strlen($digits) >= 4 ? substr($digits, -4) : null;
            $titular = isset($card['titular']) ? trim((string) $card['titular']) : null;

            $reference = $last4 !== null
                ? 'TARJETA-****'.$last4
                : 'TARJETA-SIM-'.strtoupper(substr(md5((string) $subscription->id.microtime(true)), 0, 16));

            $paymentMeta = array_merge(
                $this->pricing->paymentMetaFromQuote($pricing),
                [
                    'simulado' => true,
                    'origen' => 'checkout_tienda_cliente',
                    'nota' => 'Mismo criterio que CarritoController::checkout en api-ejemplo: sin pasarela, pedido/subscripción marcada como pagada.',
                    'titular' => $titular !== '' ? $titular : null,
                    'ultimos_cuatro' => $last4,
                ]
            );

            $this->activateSubscription($user->id, $subscription->id, $reference, 'tarjeta', $paymentMeta);

            return response()->json([
                'success' => true,
                'message' => 'Pago con tarjeta confirmado (simulación, sin pasarela).',
                'data' => [
                    'status' => 'paid',
                    'subscription_id' => $subscription->id,
                ],
            ]);
        }

        $frontendBase = rtrim((string) config('services.frontend_url', config('app.url')), '/');
        $returnUrl = $data['return_url'] ?? ($frontendBase.'/tienda-cliente');
        $cancelUrl = $data['cancel_url'] ?? $returnUrl;

        if ($data['method'] === 'paypal') {
            if (! $this->payPal->isConfigured()) {
                return response()->json(['success' => false, 'message' => 'PayPal no está configurado en el servidor.'], 503);
            }

            $payload = [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => 'default',
                    'custom_id' => (string) $user->id,
                    'description' => 'Suscripción plan #'.$subscription->id,
                    'amount' => [
                        'currency_code' => 'MXN',
                        'value' => number_format($total, 2, '.', ''),
                    ],
                ]],
                'application_context' => [
                    'return_url' => $returnUrl,
                    'cancel_url' => $cancelUrl,
                    'shipping_preference' => 'NO_SHIPPING',
                    'user_action' => 'PAY_NOW',
                    'brand_name' => (string) config('app.name', 'Salud'),
                ],
            ];

            try {
                $res = $this->payPal->createOrder($payload);
            } catch (Throwable $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
            }

            $orderId = (string) ($res['id'] ?? '');
            $approveUrl = PayPalService::extractApproveUrl($res);
            if ($orderId === '' || ! $approveUrl) {
                return response()->json(['success' => false, 'message' => 'PayPal no devolvió la orden de pago.'], 502);
            }

            PayPalOrderSnapshot::updateOrCreate(
                ['paypal_order_id' => $orderId],
                [
                    'user_id' => $user->id,
                    'subscription_id' => $subscription->id,
                    'snapshot' => [
                        'subscription_id' => $subscription->id,
                        'total' => $total,
                        'currency' => 'MXN',
                    ],
                    'expires_at' => now()->addMinutes(self::SNAPSHOT_TTL_MINUTES),
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'status' => 'redirect',
                    'gateway' => 'paypal',
                    'redirect_url' => $approveUrl,
                    'reference' => $orderId,
                ],
            ]);
        }

        if (! $this->mercadoPago->isConfigured()) {
            return response()->json(['success' => false, 'message' => 'Mercado Pago no está configurado en el servidor.'], 503);
        }

        $notificationUrl = MercadoPagoService::mercadoPagoNotificationUrlForPreference();

        $payload = [
            'items' => [[
                'title' => substr((string) config('app.name', 'Salud').' — '.$plan->name, 0, 256),
                'quantity' => 1,
                'currency_id' => 'MXN',
                'unit_price' => (float) $total,
            ]],
            'back_urls' => [
                'success' => $returnUrl,
                'failure' => $cancelUrl,
                'pending' => $cancelUrl,
            ],
            'external_reference' => 'sub_'.$subscription->id.'_user_'.$user->id,
            'statement_descriptor' => substr(preg_replace('/[^a-zA-Z0-9 ]/', '', (string) config('app.name', 'Salud')), 0, 22),
        ];

        if ($notificationUrl !== null) {
            $payload['notification_url'] = $notificationUrl;
        }

        $payerEmail = trim((string) ($user->email ?? ''));
        if ($payerEmail !== '' && ! $this->mercadoPago->isTestCredentials()) {
            $payload['payer'] = ['email' => $payerEmail];
        }

        if (MercadoPagoService::canUseMercadoPagoAutoReturn((string) $returnUrl)) {
            $payload['auto_return'] = 'approved';
        }

        if ($this->mercadoPago->isTestCredentials()) {
            $payload['payment_methods'] = [
                'excluded_payment_types' => [
                    ['id' => 'ticket'],
                    ['id' => 'atm'],
                    ['id' => 'bank_transfer'],
                ],
            ];
            $payload['binary_mode'] = true;
        }

        try {
            $res = $this->mercadoPago->createPreference($payload);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        $preferenceId = (string) ($res['id'] ?? '');
        $checkoutUrl = MercadoPagoService::checkoutUrl($res, $this->mercadoPago->isTestCredentials());
        if ($preferenceId === '' || ! $checkoutUrl) {
            return response()->json(['success' => false, 'message' => 'Mercado Pago no devolvió la preferencia de pago.'], 502);
        }

        MercadoPagoPreferenceSnapshot::updateOrCreate(
            ['preference_id' => $preferenceId],
            [
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'snapshot' => [
                    'subscription_id' => $subscription->id,
                    'total' => $total,
                    'currency' => 'MXN',
                ],
                'expires_at' => now()->addMinutes(self::SNAPSHOT_TTL_MINUTES),
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'status' => 'redirect',
                'gateway' => 'mercadopago',
                'redirect_url' => $checkoutUrl,
                'reference' => $preferenceId,
            ],
        ]);
    }

    public function paypalCapture(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => 'required|string|max:100',
        ]);

        $row = PayPalOrderSnapshot::query()
            ->where('paypal_order_id', $data['order_id'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Orden de PayPal no encontrada.'], 404);
        }

        try {
            $order = $this->payPal->getOrder($data['order_id']);
            $status = strtoupper((string) ($order['status'] ?? ''));
            $cap = $status === 'COMPLETED' ? $order : $this->payPal->captureOrder($data['order_id']);
            $captured = PayPalService::capturedAmount($cap);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        if (! $captured) {
            return response()->json(['success' => false, 'message' => 'No se pudo validar el pago de PayPal.'], 422);
        }

        $snapshot = $row->snapshot ?? [];
        $expected = round((float) ($snapshot['total'] ?? 0), 2);
        $paid = round((float) ($captured['value'] ?? 0), 2);
        if (abs($expected - $paid) > 0.02) {
            return response()->json(['success' => false, 'message' => 'El monto pagado no coincide.'], 422);
        }

        if (($snapshot['type'] ?? '') === 'add_days') {
            $this->mergeExtraPaidDays(
                $request->user()->id,
                (int) $row->subscription_id,
                $snapshot['weekdays'] ?? [],
                (string) $data['order_id'],
                'paypal',
                is_array($snapshot['slots'] ?? null) ? $snapshot['slots'] : null
            );

            return response()->json(['success' => true, 'message' => 'Días adicionales confirmados con PayPal.']);
        }

        $this->activateSubscription(
            $request->user()->id,
            $row->subscription_id,
            (string) $data['order_id'],
            'paypal'
        );

        return response()->json(['success' => true, 'message' => 'Pago confirmado con PayPal.']);
    }

    public function mercadoPagoConfirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payment_id' => 'required|string|max:120',
            'preference_id' => 'nullable|string|max:120',
        ]);

        try {
            $payment = $this->mercadoPago->getPayment($data['payment_id']);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        $status = strtolower((string) ($payment['status'] ?? ''));
        if ($status !== 'approved') {
            return response()->json(['success' => false, 'message' => 'El pago no está aprobado.'], 422);
        }

        $prefId = (string) ($payment['preference_id'] ?? $data['preference_id'] ?? '');
        if ($prefId === '') {
            return response()->json(['success' => false, 'message' => 'No se encontró la preferencia de pago.'], 404);
        }

        $row = MercadoPagoPreferenceSnapshot::query()
            ->where('preference_id', $prefId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Preferencia de pago no encontrada.'], 404);
        }

        $snapshot = $row->snapshot ?? [];
        $expected = round((float) ($snapshot['total'] ?? 0), 2);
        $paid = round((float) ($payment['transaction_amount'] ?? 0), 2);
        if (abs($expected - $paid) > 0.02) {
            return response()->json(['success' => false, 'message' => 'El monto pagado no coincide.'], 422);
        }

        if (($snapshot['type'] ?? '') === 'add_days') {
            $this->mergeExtraPaidDays(
                $request->user()->id,
                (int) $row->subscription_id,
                $snapshot['weekdays'] ?? [],
                (string) $data['payment_id'],
                'mercadopago',
                is_array($snapshot['slots'] ?? null) ? $snapshot['slots'] : null
            );

            return response()->json(['success' => true, 'message' => 'Días adicionales confirmados con Mercado Pago.']);
        }

        $this->activateSubscription(
            $request->user()->id,
            $row->subscription_id,
            (string) $data['payment_id'],
            'mercadopago'
        );

        return response()->json(['success' => true, 'message' => 'Pago confirmado con Mercado Pago.']);
    }

    public function addDays(Request $request): JsonResponse
    {
        $data = $request->validate([
            'paid_days' => 'nullable|array|min:1',
            'paid_days.*' => 'integer|min:0|max:6',
            'paid_day_slots' => 'nullable|array|min:1',
            'paid_day_slots.*.weekday' => 'required_with:paid_day_slots|integer|min:0|max:6',
            'paid_day_slots.*.date' => 'required_with:paid_day_slots|date_format:Y-m-d',
            'method' => 'required|in:tarjeta,paypal,mercadopago,gratis',
            'return_url' => 'nullable|string|max:2048',
            'cancel_url' => 'nullable|string|max:2048',
        ]);

        if ($data['method'] !== 'gratis' && ! MetodoPagoToggle::isEnabled($data['method'])) {
            return response()->json([
                'success' => false,
                'message' => 'Este método de pago está temporalmente desactivado.',
            ], 422);
        }

        $user = $request->user();
        $subscription = UserPlanSubscription::query()
            ->with('plan')
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->where('payment_status', 'paid')
            ->latest('id')
            ->first();

        if (! $subscription || ! $subscription->plan) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes un plan activo para agregar días.',
            ], 422);
        }

        if (empty($data['paid_day_slots']) && empty($data['paid_days'])) {
            return response()->json([
                'success' => false,
                'message' => 'Indica al menos una fecha para agregar.',
            ], 422);
        }

        $newSlots = null;
        $slots = $subscription->paid_day_slots ?? [];
        $activeDates = collect(PaidDaySlots::activeSlots($slots))->pluck('date')->flip();

        if (! empty($data['paid_day_slots'])) {
            $requestedSlots = PaidDaySlots::normalizeClientSlots($data['paid_day_slots']);
            $newSlots = collect($requestedSlots)
                ->filter(fn ($slot) => ! $activeDates->has($slot['date']))
                ->values()
                ->all();

            if ($newSlots === []) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esas fechas ya están pagadas en tu plan.',
                ], 422);
            }

            $newWeekdays = PaidDaySlots::weekdaysFromSlots($newSlots);
            $dayCount = count($newSlots);
        } else {
            $activeWeekdays = PaidDaySlots::weekdaysWithActiveSlot($slots);
            $requested = PaidDaySlots::normalizeWeekdays($data['paid_days'] ?? []);
            $newWeekdays = collect($requested)
                ->filter(fn ($weekday) => ! in_array($weekday, $activeWeekdays, true))
                ->values()
                ->all();

            if ($newWeekdays === []) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esos días ya tienen una fecha vigente. Cuando pase la fecha podrás volver a pagarlos.',
                ], 422);
            }

            $newSlots = null;
            $dayCount = count($newWeekdays);
        }

        $plan = $subscription->plan;
        $pricing = $this->pricing->quote(
            $user,
            (float) $plan->price_per_day,
            $dayCount ?? count($newSlots ?? $newWeekdays),
            (int) $plan->id
        );
        $pricingError = $this->validateCheckoutMethod($data['method'], $pricing);
        if ($pricingError) {
            return $pricingError;
        }
        $total = (float) $pricing['total'];

        if ($data['method'] === 'gratis') {
            $reference = 'GRATIS-EXTRA-'.strtoupper(substr(md5((string) $subscription->id.microtime(true)), 0, 12));
            $this->mergeExtraPaidDays(
                $user->id,
                $subscription->id,
                $newWeekdays,
                $reference,
                'gratis',
                $newSlots ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Día(s) agregado(s) sin costo.',
                'data' => [
                    'status' => 'paid',
                    'subscription_id' => $subscription->id,
                    'added_weekdays' => $newWeekdays,
                    'total' => $total,
                    'pricing' => $pricing,
                ],
            ]);
        }

        if ($data['method'] === 'tarjeta') {
            $reference = 'TARJETA-EXTRA-'.strtoupper(substr(md5((string) $subscription->id.microtime(true)), 0, 12));
            $this->mergeExtraPaidDays(
                $user->id,
                $subscription->id,
                $newWeekdays,
                $reference,
                'tarjeta',
                $newSlots ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Día(s) adicional(es) agregado(s) a tu plan.',
                'data' => [
                    'status' => 'paid',
                    'subscription_id' => $subscription->id,
                    'added_weekdays' => $newWeekdays,
                    'total' => $total,
                ],
            ]);
        }

        $frontendBase = rtrim((string) config('services.frontend_url', config('app.url')), '/');
        $returnUrl = $data['return_url'] ?? ($frontendBase.'/tienda-cliente');
        $cancelUrl = $data['cancel_url'] ?? $returnUrl;

        if ($data['method'] === 'paypal') {
            if (! $this->payPal->isConfigured()) {
                return response()->json(['success' => false, 'message' => 'PayPal no está configurado en el servidor.'], 503);
            }

            $payload = [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => 'add_days',
                    'custom_id' => (string) $user->id,
                    'description' => 'Días extra plan #'.$subscription->id,
                    'amount' => [
                        'currency_code' => 'MXN',
                        'value' => number_format($total, 2, '.', ''),
                    ],
                ]],
                'application_context' => [
                    'return_url' => $returnUrl,
                    'cancel_url' => $cancelUrl,
                    'shipping_preference' => 'NO_SHIPPING',
                    'user_action' => 'PAY_NOW',
                    'brand_name' => (string) config('app.name', 'Salud'),
                ],
            ];

            try {
                $res = $this->payPal->createOrder($payload);
            } catch (Throwable $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
            }

            $orderId = (string) ($res['id'] ?? '');
            $approveUrl = PayPalService::extractApproveUrl($res);
            if ($orderId === '' || ! $approveUrl) {
                return response()->json(['success' => false, 'message' => 'PayPal no devolvió la orden de pago.'], 502);
            }

            PayPalOrderSnapshot::updateOrCreate(
                ['paypal_order_id' => $orderId],
                [
                    'user_id' => $user->id,
                    'subscription_id' => $subscription->id,
                    'snapshot' => [
                        'type' => 'add_days',
                        'subscription_id' => $subscription->id,
                        'weekdays' => $newWeekdays,
                        'slots' => $newSlots ?? null,
                        'total' => $total,
                        'currency' => 'MXN',
                    ],
                    'expires_at' => now()->addMinutes(self::SNAPSHOT_TTL_MINUTES),
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'status' => 'redirect',
                    'gateway' => 'paypal',
                    'redirect_url' => $approveUrl,
                    'reference' => $orderId,
                ],
            ]);
        }

        if (! $this->mercadoPago->isConfigured()) {
            return response()->json(['success' => false, 'message' => 'Mercado Pago no está configurado en el servidor.'], 503);
        }

        $notificationUrl = MercadoPagoService::mercadoPagoNotificationUrlForPreference();
        $payload = [
            'items' => [[
                'title' => substr((string) config('app.name', 'Salud').' — Días extra', 0, 256),
                'quantity' => 1,
                'currency_id' => 'MXN',
                'unit_price' => (float) $total,
            ]],
            'back_urls' => [
                'success' => $returnUrl,
                'failure' => $cancelUrl,
                'pending' => $cancelUrl,
            ],
            'external_reference' => 'sub_'.$subscription->id.'_add_days',
            'statement_descriptor' => substr(preg_replace('/[^a-zA-Z0-9 ]/', '', (string) config('app.name', 'Salud')), 0, 22),
        ];

        if ($notificationUrl !== null) {
            $payload['notification_url'] = $notificationUrl;
        }

        if (MercadoPagoService::canUseMercadoPagoAutoReturn((string) $returnUrl)) {
            $payload['auto_return'] = 'approved';
        }

        try {
            $res = $this->mercadoPago->createPreference($payload);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        $preferenceId = (string) ($res['id'] ?? '');
        $checkoutUrl = MercadoPagoService::checkoutUrl($res, $this->mercadoPago->isTestCredentials());
        if ($preferenceId === '' || ! $checkoutUrl) {
            return response()->json(['success' => false, 'message' => 'Mercado Pago no devolvió la preferencia de pago.'], 502);
        }

        MercadoPagoPreferenceSnapshot::updateOrCreate(
            ['preference_id' => $preferenceId],
            [
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'snapshot' => [
                    'type' => 'add_days',
                    'subscription_id' => $subscription->id,
                    'weekdays' => $newWeekdays,
                    'slots' => $newSlots ?? null,
                    'total' => $total,
                    'currency' => 'MXN',
                ],
                'expires_at' => now()->addMinutes(self::SNAPSHOT_TTL_MINUTES),
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'status' => 'redirect',
                'gateway' => 'mercadopago',
                'redirect_url' => $checkoutUrl,
                'reference' => $preferenceId,
            ],
        ]);
    }

    /**
     * @param  array<int>  $newWeekdays
     * @param  array<int, array<string, mixed>>|null  $explicitSlots
     */
    private function mergeExtraPaidDays(
        int $userId,
        int $subscriptionId,
        array $newWeekdays,
        string $paymentReference,
        string $method,
        ?array $explicitSlots = null,
    ): void {
        DB::transaction(function () use ($userId, $subscriptionId, $newWeekdays, $paymentReference, $method, $explicitSlots) {
            /** @var UserPlanSubscription $subscription */
            $subscription = UserPlanSubscription::query()
                ->where('id', $subscriptionId)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            $newWeekdays = PaidDaySlots::normalizeWeekdays($newWeekdays);

            if ($explicitSlots !== null && $explicitSlots !== []) {
                $incoming = PaidDaySlots::normalizeClientSlots($explicitSlots);
                $byDate = collect($subscription->paid_day_slots ?? [])->keyBy('date');
                foreach ($incoming as $slot) {
                    $byDate->put($slot['date'], $slot);
                }
                $subscription->paid_day_slots = $byDate->sortBy('date')->values()->all();
            } else {
                $startsAt = optional($subscription->starts_at)->toDateString() ?? now()->toDateString();
                $endsAt = optional($subscription->ends_at)->toDateString() ?? now()->addMonth()->toDateString();

                $subscription->paid_day_slots = PaidDaySlots::appendForPeriod(
                    $subscription->paid_day_slots ?? [],
                    $newWeekdays,
                    $startsAt,
                    $endsAt
                );
            }
            $activeSlots = PaidDaySlots::activeSlots($subscription->paid_day_slots ?? []);
            $subscription->paid_days = PaidDaySlots::weekdaysWithActiveSlot($subscription->paid_day_slots ?? []);
            $subscription->days_per_week = max((int) $subscription->days_per_week, count($activeSlots));
            $subscription->payment_reference = $paymentReference;
            $subscription->payment_method = $method;
            $subscription->save();
        });
    }

    /**
     * @param  array<string, mixed>|null  $paymentMeta
     */
    private function validateCheckoutMethod(string $method, array $pricing): ?JsonResponse
    {
        if ($method === 'gratis' && ! ($pricing['is_free'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes un beneficio de compra gratis para esta selección.',
            ], 422);
        }

        if ($method !== 'gratis' && ($pricing['is_free'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => 'Tu compra es gratis. Usa el botón «Gratis» para activarla.',
            ], 422);
        }

        return null;
    }

    private function activateSubscription(int $userId, int $subscriptionId, string $paymentReference, string $method = 'tarjeta', ?array $paymentMeta = null): void
    {
        DB::transaction(function () use ($userId, $subscriptionId, $paymentReference, $method, $paymentMeta) {
            UserPlanSubscription::query()
                ->where('user_id', $userId)
                ->where('id', '!=', $subscriptionId)
                ->update(['is_active' => false]);

            /** @var UserPlanSubscription $subscription */
            $subscription = UserPlanSubscription::query()
                ->where('id', $subscriptionId)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            $subscription->is_active = true;
            $subscription->payment_status = 'paid';
            $subscription->payment_reference = $paymentReference;
            $subscription->payment_method = $method;
            if ($paymentMeta !== null) {
                $subscription->payment_meta = $paymentMeta;
            }
            $subscription->save();
        });
    }
}

