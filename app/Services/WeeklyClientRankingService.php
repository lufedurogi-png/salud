<?php

namespace App\Services;

use App\Models\RoutineCompletionLog;
use App\Models\UserPlanSubscription;
use App\Support\PaidDaySlots;
use Carbon\Carbon;

class WeeklyClientRankingService
{
    private const DAYS_IN_WEEK = 7;

    public function ranking(): array
    {
        $axis = $this->rankingWeekAxis();
        $weekDates = collect($axis)->pluck('date')->values();
        $weekStart = $weekDates->first();
        $weekEnd = $weekDates->last();

        $subs = UserPlanSubscription::query()
            ->with('user:id,name,alias,tipo')
            ->where('is_active', true)
            ->where('payment_status', 'paid')
            ->where(function ($query) {
                $today = now()->toDateString();
                $query->whereNull('ends_at')->orWhereDate('ends_at', '>=', $today);
            })
            ->get()
            ->filter(fn ($sub) => (int) ($sub->user?->tipo ?? 0) === 2);

        $today = now('America/Mexico_City')->toDateString();

        return $subs->map(function ($sub) use ($axis, $weekStart, $weekEnd, $today) {
            $userId = (int) $sub->user_id;
            $slotDates = collect($sub->paid_day_slots ?? [])
                ->map(fn ($slot) => $this->normalizeDate($slot['date'] ?? null))
                ->filter(fn ($date) => $date && $date >= $weekStart && $date <= $weekEnd && $date >= $today)
                ->unique()
                ->values();

            if ($slotDates->isEmpty() && ! empty($sub->paid_days)) {
                $slotDates = collect($sub->paid_days)
                    ->map(fn ($weekday) => PaidDaySlots::dateForWeekdayInWeek((int) $weekday, now('America/Mexico_City')))
                    ->filter(fn ($date) => $date >= $weekStart && $date <= $weekEnd && $date >= $today)
                    ->unique()
                    ->values();
            }

            $completedLogs = RoutineCompletionLog::query()
                ->where('user_id', $userId)
                ->where('is_completed', true)
                ->whereBetween('completed_on', [$weekStart, $weekEnd])
                ->orderBy('created_at')
                ->get(['completed_on', 'created_at']);

            $completedDates = $completedLogs
                ->pluck('completed_on')
                ->map(fn ($d) => $this->normalizeDate($d))
                ->filter()
                ->unique()
                ->values();
            $firstCompletedAt = optional($completedLogs->first())->created_at?->toDateTimeString();

            $progressPerCompletion = (int) round(100 / self::DAYS_IN_WEEK);
            $cumulativeProgress = 0;
            $points = collect($axis)->map(function ($day) use (
                $slotDates,
                $completedDates,
                $progressPerCompletion,
                &$cumulativeProgress
            ) {
                $dayDate = $this->normalizeDate($day['date'] ?? null);
                $isPaidDay = $slotDates->contains($dayDate);
                $isCompletedDay = $completedDates->contains($dayDate);

                $value = 0;
                if ($isPaidDay && $isCompletedDay) {
                    $cumulativeProgress = min(100, $cumulativeProgress + $progressPerCompletion);
                    $value = $cumulativeProgress;
                }

                return [
                    'weekday' => $day['weekday'],
                    'label' => $day['label'],
                    'date' => $dayDate,
                    'value' => $value,
                ];
            })->values()->all();

            $completedCount = $slotDates->isNotEmpty()
                ? $completedDates->intersect($slotDates)->count()
                : $completedDates->count();
            $score = (int) round((min($completedCount, self::DAYS_IN_WEEK) / self::DAYS_IN_WEEK) * 100);

            return [
                'id' => $userId,
                'name' => $sub->user?->alias ?: ($sub->user?->name ?: 'Usuario'),
                'score' => max(0, min(100, $score)),
                'first_completed_at' => $firstCompletedAt,
                'points' => $points,
            ];
        })
            ->sort(function ($a, $b) {
                if (($a['score'] ?? 0) !== ($b['score'] ?? 0)) {
                    return ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
                }

                $aFirst = $a['first_completed_at'] ?? '9999-12-31 23:59:59';
                $bFirst = $b['first_completed_at'] ?? '9999-12-31 23:59:59';
                if ($aFirst !== $bFirst) {
                    return $aFirst <=> $bFirst;
                }

                return ($a['id'] ?? 0) <=> ($b['id'] ?? 0);
            })
            ->values()
            ->take(10)
            ->map(function ($row) {
                unset($row['first_completed_at']);

                return $row;
            })
            ->all();
    }

    public function rankingTrends(array $ranking): array
    {
        $weekDates = collect($this->rankingWeekAxis())->values();
        $series = collect($ranking)->values()->map(function ($row, $idx) {
            return [
                'id' => (int) ($row['id'] ?? 0),
                'name' => $row['name'] ?? ('Usuario '.($idx + 1)),
                'rank' => $idx + 1,
                'score' => (int) ($row['score'] ?? 0),
                'points' => $row['points'] ?? [],
            ];
        })->all();

        return [
            'weekdays' => $weekDates->values()->all(),
            'series' => $series,
        ];
    }

    public function rankingWeekAxis(): array
    {
        $localNow = now('America/Mexico_City');
        $weekStart = $localNow->copy()->startOfWeek();
        $labels = [1 => 'Lun', 2 => 'Mar', 3 => 'Mié', 4 => 'Jue', 5 => 'Vie', 6 => 'Sáb', 0 => 'Dom'];

        return collect([1, 2, 3, 4, 5, 6, 0])->map(function ($weekday) use ($weekStart, $labels) {
            $date = ($weekday === 0 ? $weekStart->copy()->addDays(6) : $weekStart->copy()->addDays($weekday - 1))
                ->toDateString();

            return [
                'weekday' => $weekday,
                'date' => $date,
                'label' => $labels[$weekday] ?? (string) $weekday,
            ];
        })->values()->all();
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
