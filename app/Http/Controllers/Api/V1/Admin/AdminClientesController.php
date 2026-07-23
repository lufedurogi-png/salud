<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\RoutineClientComment;
use App\Models\RoutineDay;
use App\Models\RoutineExercise;
use App\Models\RoutineSession;
use App\Models\RoutineSessionExercise;
use App\Models\User;
use App\Models\UserPlanSubscription;
use App\Models\UserProfile;
use App\Support\PaidDaySlots;
use App\Support\RoutineCalendar;
use Illuminate\Http\Request;

class AdminClientesController extends Controller
{
    public function index()
    {
        $clientes = User::with(['profile', 'subscriptions.plan'])
            ->where('tipo', 2)
            ->whereHas('subscriptions', function ($query) {
                $query->where('is_active', true)
                    ->where('payment_status', 'paid')
                    ->where(function ($q) {
                        $today = now()->toDateString();
                        $q->whereNull('ends_at')->orWhereDate('ends_at', '>=', $today);
                    });
            })
            ->orderBy('name')
            ->get()
            ->map(function (User $u) {
                $sub = $u->subscriptions
                    ->where('is_active', true)
                    ->where('payment_status', 'paid')
                    ->sortByDesc('id')
                    ->first();

                $allSlots = $sub?->paid_day_slots ?? [];
                $activeSlots = PaidDaySlots::activeSlots($allSlots);

                $sessions = RoutineSession::query()
                    ->with('exercises')
                    ->where('user_id', $u->id)
                    ->whereIn('session_date', collect($activeSlots)->pluck('date')->filter()->all())
                    ->get()
                    ->keyBy(fn (RoutineSession $s) => $s->session_date->toDateString());

                $clientComments = RoutineClientComment::query()
                    ->where('user_id', $u->id)
                    ->orderByDesc('created_at')
                    ->get()
                    ->map(fn (RoutineClientComment $comment) => [
                        'id' => $comment->id,
                        'date' => $comment->comment_date->toDateString(),
                        'weekday' => (int) $comment->weekday,
                        'weekday_label' => PaidDaySlots::WEEKDAY_NAMES[(int) $comment->weekday] ?? '',
                        'weekday_short' => PaidDaySlots::WEEKDAY_SHORT[(int) $comment->weekday] ?? '',
                        'comment' => $comment->body,
                        'created_at' => optional($comment->created_at)?->toIso8601String(),
                    ])
                    ->values()
                    ->all();

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'last_name' => $u->last_name,
                    'email' => $u->email,
                    'alias' => $u->alias,
                    'profile' => $u->profile,
                    'subscription' => $sub ? [
                        'id' => $sub->id,
                        'plan_id' => $sub->plan_id,
                        'plan_name' => $sub->plan?->name,
                        'days_per_week' => $sub->days_per_week,
                        'paid_days' => $sub->paid_days,
                        'paid_day_slots' => $activeSlots,
                        'starts_at' => optional($sub->starts_at)->toDateString(),
                        'ends_at' => optional($sub->ends_at)->toDateString(),
                        'is_active' => $sub->is_active,
                    ] : null,
                    'client_comments' => $clientComments,
                    'sessions' => collect($activeSlots)->map(function ($slot) use ($sessions) {
                        $date = (string) ($slot['date'] ?? '');
                        $session = $sessions->get($date);

                        return [
                            'date' => $date,
                            'weekday' => (int) ($slot['weekday'] ?? RoutineCalendar::weekdayFromDate($date)),
                            'weekday_label' => $slot['label'] ?? PaidDaySlots::WEEKDAY_NAMES[(int) ($slot['weekday'] ?? 0)] ?? '',
                            'weekday_short' => $slot['label_short'] ?? PaidDaySlots::WEEKDAY_SHORT[(int) ($slot['weekday'] ?? 0)] ?? '',
                            'focus' => $session?->focus,
                            'coach_comments' => $session?->coach_comments,
                            'rows' => $session
                                ? $session->exercises->map(fn ($row) => [
                                    'nombre' => $row->name,
                                    'reps' => $row->detail,
                                    'video' => $row->video_url,
                                ])->values()
                                : [],
                        ];
                    })->sortBy('date')->values(),
                ];
            })
            ->filter(fn ($c) => $c['subscription'] !== null)
            ->values();

        return response()->json([
            'success' => true,
            'data' => $clientes,
            'meta' => [
                'plans' => Plan::query()->where('is_active', true)->orderBy('is_specialized')->orderBy('name')->get(),
            ],
        ]);
    }

    public function updateProfile(Request $request, int $userId)
    {
        $data = $request->validate([
            'weight_kg' => 'nullable|numeric',
            'height_cm' => 'nullable|numeric',
            'sex' => 'nullable|string|max:120',
            'measures' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:1|max:120',
            'metabolic_age' => 'nullable|integer|min:1|max:120',
            'weekday_color_mode' => 'nullable|string|in:multi,neutral',
        ]);

        $profile = UserProfile::firstOrCreate(['user_id' => $userId]);
        $profile->fill($data)->save();

        return response()->json(['success' => true, 'data' => $profile]);
    }

    public function updatePlan(Request $request, int $userId)
    {
        $data = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'days_per_week' => 'required|integer|min:1|max:7',
            'paid_days' => 'nullable|array',
            'paid_day_slots' => 'nullable|array',
            'paid_day_slots.*.weekday' => 'required_with:paid_day_slots|integer|min:0|max:6',
            'paid_day_slots.*.date' => 'required_with:paid_day_slots|date_format:Y-m-d',
            'is_active' => 'nullable|boolean',
        ]);

        UserPlanSubscription::where('user_id', $userId)->update(['is_active' => false]);

        $startsAt = now()->toDateString();
        $endsAt = now()->addMonth()->toDateString();
        $paidDaySlots = ! empty($data['paid_day_slots'])
            ? PaidDaySlots::normalizeClientSlots($data['paid_day_slots'])
            : PaidDaySlots::buildForPeriod($data['paid_days'] ?? [], $startsAt, $endsAt);

        $sub = UserPlanSubscription::create([
            'user_id' => $userId,
            'plan_id' => $data['plan_id'],
            'days_per_week' => (int) $data['days_per_week'],
            'paid_days' => PaidDaySlots::weekdaysFromSlots($paidDaySlots),
            'paid_day_slots' => $paidDaySlots,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'payment_method' => 'admin',
            'payment_status' => 'paid',
            'payment_reference' => 'ADMIN-'.strtoupper(substr(md5((string) microtime(true)), 0, 10)),
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        return response()->json(['success' => true, 'data' => $sub]);
    }

    public function upsertRoutineSession(Request $request, int $userId, string $date)
    {
        $data = $request->validate([
            'focus' => 'nullable|string|max:120',
            'coach_comments' => 'nullable|string|max:5000',
            'rows' => 'nullable|array',
            'rows.*.nombre' => 'required|string|max:160',
            'rows.*.reps' => 'nullable|string|max:120',
            'rows.*.video' => 'nullable|string|max:255',
        ]);

        $sessionDate = now()->parse($date)->toDateString();
        $weekday = RoutineCalendar::weekdayFromDate($sessionDate);

        $session = RoutineSession::updateOrCreate(
            ['user_id' => $userId, 'session_date' => $sessionDate],
            [
                'weekday' => $weekday,
                'focus' => $data['focus'] ?? null,
                'coach_comments' => $data['coach_comments'] ?? null,
            ]
        );

        RoutineSessionExercise::where('routine_session_id', $session->id)->delete();
        foreach (($data['rows'] ?? []) as $index => $row) {
            RoutineSessionExercise::create([
                'routine_session_id' => $session->id,
                'name' => $row['nombre'],
                'detail' => $row['reps'] ?? null,
                'video_url' => $row['video'] ?? null,
                'sort_order' => $index,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $session->load('exercises'),
        ]);
    }

    /** @deprecated Use upsertRoutineSession */
    public function upsertRoutineDay(Request $request, int $userId, int $weekday)
    {
        $data = $request->validate([
            'focus' => 'nullable|string|max:120',
            'is_active' => 'required|boolean',
            'rows' => 'nullable|array',
            'rows.*.nombre' => 'required|string|max:160',
            'rows.*.reps' => 'nullable|string|max:120',
            'rows.*.video' => 'nullable|string|max:255',
        ]);

        $day = RoutineDay::updateOrCreate(
            ['user_id' => $userId, 'weekday' => $weekday],
            ['focus' => $data['focus'] ?? null, 'is_active' => $data['is_active']]
        );

        RoutineExercise::where('routine_day_id', $day->id)->delete();
        foreach (($data['rows'] ?? []) as $index => $row) {
            RoutineExercise::create([
                'routine_day_id' => $day->id,
                'name' => $row['nombre'],
                'detail' => $row['reps'] ?? null,
                'video_url' => $row['video'] ?? null,
                'sort_order' => $index,
            ]);
        }

        return response()->json(['success' => true, 'data' => $day->load('exercises')]);
    }
}
