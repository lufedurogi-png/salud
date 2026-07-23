<?php

namespace App\Support;

use App\Models\RoutineCompletionLog;
use App\Models\RoutineSession;
use App\Models\RoutineClientComment;
use App\Models\UserPlanSubscription;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class RoutineCalendar
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function buildForUser(int $userId, ?UserPlanSubscription $subscription): array
    {
        $today = now()->startOfDay();
        $monthEnd = now()->copy()->endOfMonth();
        $paidDates = self::paidDatesSet($subscription);

        $sessions = RoutineSession::query()
            ->with('exercises')
            ->where('user_id', $userId)
            ->whereBetween('session_date', [$today->toDateString(), $monthEnd->toDateString()])
            ->get()
            ->keyBy(fn (RoutineSession $s) => $s->session_date->toDateString());

        $completions = RoutineCompletionLog::query()
            ->where('user_id', $userId)
            ->whereBetween('completed_on', [$today->toDateString(), $monthEnd->toDateString()])
            ->get()
            ->keyBy(fn ($log) => $log->completed_on->toDateString());

        $commentsByDate = RoutineClientComment::query()
            ->where('user_id', $userId)
            ->whereBetween('comment_date', [$today->toDateString(), $monthEnd->toDateString()])
            ->orderBy('created_at')
            ->get()
            ->groupBy(fn (RoutineClientComment $c) => $c->comment_date->toDateString());

        $items = [];
        $cursor = $today->copy();

        while ($cursor->lte($monthEnd)) {
            $date = $cursor->toDateString();
            $weekday = (int) $cursor->dayOfWeek;
            $isPaid = $paidDates->has($date);
            /** @var RoutineSession|null $session */
            $session = $sessions->get($date);
            $completion = $completions->get($date);
            $dayComments = $isPaid
                ? ($commentsByDate->get($date) ?? collect())->map(fn (RoutineClientComment $c) => [
                    'id' => $c->id,
                    'body' => $c->body,
                    'created_at' => optional($c->created_at)?->toIso8601String(),
                ])->values()->all()
                : [];

            $items[] = [
                'date' => $date,
                'weekday' => $weekday,
                'weekday_label' => PaidDaySlots::WEEKDAY_NAMES[$weekday] ?? (string) $weekday,
                'weekday_short' => PaidDaySlots::WEEKDAY_SHORT[$weekday] ?? (string) $weekday,
                'is_paid' => $isPaid,
                'status' => $isPaid
                    ? ($session?->focus ? 'Entrenamiento' : 'Plan activo')
                    : 'Descanso',
                'status_detail' => $isPaid ? null : 'Sin actividad',
                'focus' => $isPaid ? ($session?->focus ?? null) : null,
                'coach_comments' => $isPaid ? ($session?->coach_comments ?? null) : null,
                'is_completed' => (bool) ($completion?->is_completed ?? false),
                'client_comments' => $dayComments,
                'rows' => $isPaid && $session
                    ? $session->exercises->map(fn ($row) => [
                        'nombre' => $row->name,
                        'reps' => $row->detail,
                        'video' => $row->video_url,
                    ])->values()->all()
                    : [],
            ];

            $cursor->addDay();
        }

        return $items;
    }

    /**
     * @return Collection<string, true>
     */
    private static function paidDatesSet(?UserPlanSubscription $subscription): Collection
    {
        if (! $subscription) {
            return collect();
        }

        $slots = $subscription->paid_day_slots ?? [];
        if ($slots === []) {
            $startsAt = optional($subscription->starts_at)->toDateString() ?? now()->toDateString();
            $endsAt = optional($subscription->ends_at)->toDateString() ?? now()->addMonth()->toDateString();
            $slots = PaidDaySlots::buildForPeriod($subscription->paid_days ?? [], $startsAt, $endsAt);
        }

        return collect($slots)
            ->pluck('date')
            ->filter()
            ->mapWithKeys(fn ($date) => [(string) $date => true]);
    }

    public static function weekdayFromDate(string $date): int
    {
        return (int) Carbon::parse($date)->dayOfWeek;
    }
}
