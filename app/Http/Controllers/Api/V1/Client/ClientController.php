<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\RoutineDay;
use App\Models\RoutineCompletionLog;
use App\Models\User;
use App\Models\UserPlanSubscription;
use App\Models\UserProfile;
use App\Services\StorePricingService;
use App\Services\WeeklyClientRankingService;
use App\Support\PaidDaySlots;
use App\Support\RoutineCalendar;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ClientController extends Controller
{
    private const DAYS_IN_WEEK = 7;

    public function __construct(
        private WeeklyClientRankingService $weeklyRanking,
        private StorePricingService $storePricing,
    ) {}

    public function home(Request $request)
    {
        $user = $request->user()->load('profile');
        $activeSubscription = $this->activeSubscription($user->id);
        $ranking = $this->weeklyRanking->ranking();
        $rankingTrends = $this->weeklyRanking->rankingTrends($ranking);
        $rankingByWeekday = $this->rankingByWeekday();
        $week = $this->weekStatus($user->id);
        $metrics = $this->weeklyMetrics($user->id, $activeSubscription);

        return response()->json([
            'success' => true,
            'data' => [
                'profile' => [
                    'name' => $user->name,
                    'last_name' => $user->last_name,
                    'alias' => $user->alias,
                    'email' => $user->email,
                    'weight_kg' => $user->profile?->weight_kg,
                    'height_cm' => $user->profile?->height_cm,
                    'sex' => $user->profile?->sex,
                    'measures' => $user->profile?->measures,
                    'age' => $user->profile?->age,
                    'metabolic_age' => $user->profile?->metabolic_age,
                    'weekday_color_mode' => $user->profile?->weekday_color_mode ?: 'multi',
                ],
                'active_plan' => $activeSubscription ? $this->formatActivePlan($activeSubscription) : null,
                'metrics' => $metrics,
                'ranking' => $ranking,
                'ranking_trends' => $rankingTrends,
                'ranking_by_weekday' => $rankingByWeekday,
                'week' => $week,
            ],
        ]);
    }

    public function week(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $this->weekStatus($request->user()->id),
        ]);
    }

    public function routine(Request $request)
    {
        $userId = $request->user()->id;
        $subscription = $this->activeSubscription($userId);
        $items = RoutineCalendar::buildForUser($userId, $subscription);

        $profile = $request->user()->loadMissing('profile')->profile;

        return response()->json([
            'success' => true,
            'data' => [
                'month' => now()->translatedFormat('F Y'),
                'items' => $items,
                'active_plan' => $subscription ? $this->formatActivePlan($subscription) : null,
                'weekday_color_mode' => $profile?->weekday_color_mode ?: 'multi',
            ],
        ]);
    }

    public function markRoutineSession(Request $request, string $date)
    {
        $data = $request->validate([
            'is_completed' => 'required|boolean',
        ]);

        $userId = $request->user()->id;
        $sessionDate = now()->parse($date)->toDateString();
        $weekday = RoutineCalendar::weekdayFromDate($sessionDate);

        $row = RoutineCompletionLog::updateOrCreate(
            ['user_id' => $userId, 'completed_on' => $sessionDate, 'weekday' => $weekday],
            ['is_completed' => (bool) $data['is_completed']]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $sessionDate,
                'is_completed' => (bool) $row->is_completed,
            ],
        ]);
    }

    public function markRoutineDay(Request $request, int $weekday)
    {
        $data = $request->validate([
            'is_completed' => 'required|boolean',
            'date' => 'nullable|date',
        ]);

        $userId = $request->user()->id;
        if (isset($data['date'])) {
            $date = now()->parse($data['date'])->toDateString();
        } else {
            $weekStart = now()->startOfWeek();
            $date = ($weekday === 0 ? $weekStart->copy()->addDays(6) : $weekStart->copy()->addDays($weekday - 1))
                ->toDateString();
        }
        $routineDay = RoutineDay::query()
            ->where('user_id', $userId)
            ->where('weekday', $weekday)
            ->first();

        $row = RoutineCompletionLog::updateOrCreate(
            ['user_id' => $userId, 'completed_on' => $date, 'weekday' => $weekday],
            [
                'routine_day_id' => $routineDay?->id,
                'is_completed' => (bool) $data['is_completed'],
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'weekday' => $weekday,
                'is_completed' => (bool) $row->is_completed,
            ],
        ]);
    }

    public function storePlans()
    {
        $plans = Plan::where('is_active', true)->orderBy('is_specialized')->orderBy('name')->get();
        return response()->json(['success' => true, 'data' => $plans]);
    }

    public function storeDiscount(Request $request)
    {
        $planId = $request->query('plan_id');
        $summary = $this->storePricing->summaryForUser(
            $request->user(),
            $planId !== null && $planId !== '' ? (int) $planId : null
        );

        return response()->json(['success' => true, 'data' => $summary]);
    }

    public function buyPlan(Request $request)
    {
        $data = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'days_per_week' => 'required|integer|min:1|max:7',
            'paid_days' => 'nullable|array',
        ]);

        UserPlanSubscription::where('user_id', $request->user()->id)->update(['is_active' => false]);
        $sub = UserPlanSubscription::create([
            'user_id' => $request->user()->id,
            'plan_id' => $data['plan_id'],
            'days_per_week' => $data['days_per_week'],
            'starts_at' => now()->toDateString(),
            'ends_at' => now()->addMonth()->toDateString(),
            'paid_days' => $data['paid_days'] ?? [1, 2, 3, 4, 5],
            'payment_method' => 'tarjeta',
            'payment_status' => 'paid',
            'payment_reference' => 'DIRECT-'.strtoupper(substr(md5((string) now()), 0, 12)),
            'is_active' => true,
        ]);

        return response()->json(['success' => true, 'data' => $sub], 201);
    }

    public function profile(Request $request)
    {
        $user = $request->user()->load('profile');
        return response()->json([
            'success' => true,
            'data' => [
                'name' => $user->name,
                'last_name' => $user->last_name,
                'alias' => $user->alias,
                'email' => $user->email,
                'weight_kg' => $user->profile?->weight_kg,
                'height_cm' => $user->profile?->height_cm,
                'sex' => $user->profile?->sex,
                'measures' => $user->profile?->measures,
                'age' => $user->profile?->age,
                'metabolic_age' => $user->profile?->metabolic_age,
                'weekday_color_mode' => $user->profile?->weekday_color_mode ?: 'multi',
                'avatar_url' => $user->profile?->avatar_url,
            ],
        ]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
        ]);

        $user = $request->user();
        $profile = UserProfile::firstOrCreate(['user_id' => $user->id]);
        $file = $request->file('avatar');

        $extension = strtolower($file->extension() ?: $file->guessExtension() ?: 'jpg');
        $filename = $user->id.'.'.$extension;
        $directory = 'avatars';

        if ($profile->avatar_path) {
            Storage::disk('public')->delete($profile->avatar_path);
        }

        $path = $file->storeAs($directory, $filename, 'public');
        $profile->avatar_path = $path;
        $profile->save();

        return response()->json([
            'success' => true,
            'message' => 'Foto de perfil actualizada.',
            'data' => [
                'avatar_url' => $profile->avatar_url,
                'avatar_path' => $profile->avatar_path,
            ],
        ]);
    }

    public function updateAlias(Request $request)
    {
        $data = $request->validate(['alias' => 'required|string|max:120']);
        $request->user()->update(['alias' => $data['alias']]);
        return response()->json(['success' => true, 'message' => 'Alias actualizado.']);
    }

    private function weekStatus(int $userId): array
    {
        $sub = $this->activeSubscription($userId);
        $slots = $sub?->paid_day_slots ?? [];
        $start = now()->startOfWeek();
        $end = now()->endOfWeek();
        $weekCompletions = RoutineCompletionLog::query()
            ->where('user_id', $userId)
            ->whereBetween('completed_on', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($log) => $log->completed_on->toDateString());

        $today = now()->toDateString();

        return collect(range(0, 6))->map(function ($weekday) use ($userId, $sub, $slots, $weekCompletions, $today) {
            $day = RoutineDay::where('user_id', $userId)->where('weekday', $weekday)->first();
            $weekDate = PaidDaySlots::dateForWeekdayInWeek($weekday);
            $isPaid = $sub
                && $weekDate >= $today
                && PaidDaySlots::isSlotPaidOnDate($slots, $weekday, $weekDate);
            $completed = (bool) ($weekCompletions[$weekDate]->is_completed ?? false);

            return [
                'weekday' => $weekday,
                'date' => $weekDate,
                'status' => ($isPaid && $day?->is_active) ? 'Plan activo' : 'Descanso',
                'is_paid' => $isPaid,
                'is_completed' => $completed,
            ];
        })->values()->all();
    }

    private function activeSubscription(int $userId): ?UserPlanSubscription
    {
        return UserPlanSubscription::with('plan')
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->where('payment_status', 'paid')
            ->where(function ($query) {
                $today = now()->toDateString();
                $query->whereNull('ends_at')->orWhereDate('ends_at', '>=', $today);
            })
            ->latest('id')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function formatActivePlan(UserPlanSubscription $subscription): array
    {
        $allSlots = $subscription->paid_day_slots ?? [];
        $activeSlots = PaidDaySlots::activeSlots($allSlots);

        return [
            'subscription_id' => $subscription->id,
            'plan_id' => $subscription->plan_id,
            'plan_name' => $subscription->plan?->name,
            'days_per_week' => count($activeSlots) ?: (int) $subscription->days_per_week,
            'paid_days' => PaidDaySlots::weekdaysWithActiveSlot($allSlots),
            'paid_day_slots' => $activeSlots,
            'price_per_day' => (float) ($subscription->plan?->price_per_day ?? 0),
            'starts_at' => optional($subscription->starts_at)->toDateString(),
            'ends_at' => optional($subscription->ends_at)->toDateString(),
        ];
    }

    private function weeklyMetrics(int $userId, ?UserPlanSubscription $sub): array
    {
        if (! $sub) {
            return ['active_percent' => 0, 'meta_percent' => 0, 'completed_days' => 0, 'paid_days' => 0];
        }

        $slots = $sub->paid_day_slots ?? [];
        $localNow = now('America/Mexico_City');
        $start = $localNow->copy()->startOfWeek()->toDateString();
        $end = $localNow->copy()->endOfWeek()->toDateString();
        $today = $localNow->toDateString();
        $paidDatesThisWeek = collect($slots)
            ->map(fn ($slot) => $this->normalizeDate($slot['date'] ?? null))
            ->filter(fn ($date) => $date && $date >= $today && $date >= $start && $date <= $end)
            ->unique()
            ->values();

        $completed = RoutineCompletionLog::query()
            ->where('user_id', $userId)
            ->where('is_completed', true)
            ->whereIn('completed_on', $paidDatesThisWeek->all())
            ->count();

        $daysTarget = max(1, (int) $sub->days_per_week);
        $activePercent = (int) round(($completed / self::DAYS_IN_WEEK) * 100);
        $metaPercent = (int) round((min($completed, $daysTarget) / $daysTarget) * 100);

        return [
            'active_percent' => max(0, min(100, $activePercent)),
            'meta_percent' => max(0, min(100, $metaPercent)),
            'completed_days' => $completed,
            'paid_days' => $paidDatesThisWeek->count(),
        ];
    }

    private function rankingByWeekday(): array
    {
        $start = now()->startOfWeek()->toDateString();
        $end = now()->endOfWeek()->toDateString();

        $rows = DB::table('routine_completion_logs')
            ->join('users', 'users.id', '=', 'routine_completion_logs.user_id')
            ->join('user_plan_subscriptions', function ($join) {
                $join->on('user_plan_subscriptions.user_id', '=', 'users.id')
                    ->where('user_plan_subscriptions.is_active', true)
                    ->where('user_plan_subscriptions.payment_status', 'paid');
            })
            ->where('users.tipo', 2)
            ->where('routine_completion_logs.is_completed', true)
            ->whereBetween('routine_completion_logs.completed_on', [$start, $end])
            ->groupBy('routine_completion_logs.weekday')
            ->selectRaw('routine_completion_logs.weekday as weekday, COUNT(DISTINCT routine_completion_logs.user_id) as users_count')
            ->get()
            ->keyBy(fn ($row) => (int) $row->weekday);

        $labels = [
            1 => 'Lun',
            2 => 'Mar',
            3 => 'Mié',
            4 => 'Jue',
            5 => 'Vie',
            6 => 'Sáb',
            0 => 'Dom',
        ];

        return collect([1, 2, 3, 4, 5, 6, 0])->map(function ($weekday) use ($rows, $labels) {
            $count = (int) ($rows[$weekday]->users_count ?? 0);
            return [
                'weekday' => $weekday,
                'label' => $labels[$weekday] ?? (string) $weekday,
                'users_count' => $count,
            ];
        })
            ->values()
            ->all();
    }

    private function normalizeDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value->toDateString();
        }

        try {
            return Carbon::parse((string) $value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
