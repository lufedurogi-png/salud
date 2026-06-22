<?php

namespace App\Support;

use Carbon\Carbon;

class PaidDaySlots
{
    public const WEEKDAY_NAMES = [
        0 => 'Domingo',
        1 => 'Lunes',
        2 => 'Martes',
        3 => 'Miércoles',
        4 => 'Jueves',
        5 => 'Viernes',
        6 => 'Sábado',
    ];

    public const WEEKDAY_SHORT = [
        0 => 'Dom',
        1 => 'Lun',
        2 => 'Mar',
        3 => 'Mié',
        4 => 'Jue',
        5 => 'Vie',
        6 => 'Sáb',
    ];

    /**
     * @param  array<int>  $weekdays
     * @return array<int, array{weekday: int, date: string, label: string, label_short: string}>
     */
    public static function buildForPeriod(array $weekdays, string $startsAt, string $endsAt): array
    {
        $start = Carbon::parse($startsAt)->startOfDay();
        $today = now()->startOfDay();
        if ($start->lt($today)) {
            $start = $today;
        }
        $end = Carbon::parse($endsAt)->endOfDay();

        return self::slotsForWeekdays($weekdays, $start, $end);
    }

    /**
     * @param  array<int, array<string, mixed>>  $existingSlots
     * @param  array<int>  $newWeekdays
     * @return array<int, array{weekday: int, date: string, label: string, label_short: string}>
     */
    public static function appendForPeriod(
        array $existingSlots,
        array $newWeekdays,
        string $startsAt,
        string $endsAt,
    ): array {
        $from = now()->startOfDay();
        $planStart = Carbon::parse($startsAt)->startOfDay();
        if ($from->lt($planStart)) {
            $from = $planStart;
        }
        $end = Carbon::parse($endsAt)->endOfDay();
        $merged = $existingSlots;

        foreach (self::normalizeWeekdays($newWeekdays) as $weekday) {
            $date = self::firstDateForWeekday($weekday, $from, $end);
            if ($date === null) {
                continue;
            }
            $merged[] = self::slot($weekday, $date);
        }

        return $merged;
    }

    /**
     * Slots con fecha >= hoy (aún vigentes o por vigentar hoy).
     *
     * @param  array<int, array<string, mixed>>  $slots
     * @return array<int, array<string, mixed>>
     */
    public static function activeSlots(array $slots, ?string $onDate = null): array
    {
        $cutoff = $onDate ?? now()->toDateString();

        return collect($slots)
            ->filter(fn ($slot) => (string) ($slot['date'] ?? '') >= $cutoff)
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $slots
     * @return array<int>
     */
    public static function weekdaysWithActiveSlot(array $slots): array
    {
        return collect(self::activeSlots($slots))
            ->pluck('weekday')
            ->map(fn ($v) => (int) $v)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $slots
     */
    public static function hasActiveSlotForWeekday(array $slots, int $weekday): bool
    {
        return in_array($weekday, self::weekdaysWithActiveSlot($slots), true);
    }

    /**
     * @param  array<int, array<string, mixed>>  $slots
     */
    public static function isSlotPaidOnDate(array $slots, int $weekday, string $date): bool
    {
        return collect($slots)->contains(
            fn ($slot) => (int) ($slot['weekday'] ?? -1) === $weekday
                && (string) ($slot['date'] ?? '') === $date
        );
    }

    public static function dateForWeekdayInWeek(int $weekday, ?Carbon $reference = null): string
    {
        $ref = ($reference ?? now())->copy()->startOfWeek();
        if ($weekday === 0) {
            return $ref->addDays(6)->toDateString();
        }

        return $ref->addDays($weekday - 1)->toDateString();
    }

    /**
     * @param  array<int>  $weekdays
     * @return array<int>
     */
    public static function normalizeWeekdays(array $weekdays): array
    {
        return collect($weekdays)
            ->map(fn ($v) => (int) $v)
            ->filter(fn ($v) => $v >= 0 && $v <= 6)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $slots
     * @return array<int, array{weekday: int, date: string, label: string, label_short: string}>
     */
    public static function normalizeClientSlots(array $slots): array
    {
        $today = now()->toDateString();
        $byDate = [];

        foreach ($slots as $raw) {
            if (! is_array($raw)) {
                continue;
            }
            $weekday = (int) ($raw['weekday'] ?? -1);
            $date = (string) ($raw['date'] ?? '');
            if ($weekday < 0 || $weekday > 6 || $date === '') {
                continue;
            }

            try {
                $parsed = Carbon::parse($date)->startOfDay();
            } catch (\Throwable) {
                continue;
            }

            if ($parsed->toDateString() < $today) {
                continue;
            }
            if ((int) $parsed->dayOfWeek !== $weekday) {
                continue;
            }

            $byDate[$parsed->toDateString()] = self::slot($weekday, $parsed->toDateString());
        }

        return collect($byDate)->sortBy('date')->values()->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $slots
     * @return array<int>
     */
    public static function weekdaysFromSlots(array $slots): array
    {
        return collect($slots)
            ->pluck('weekday')
            ->map(fn ($v) => (int) $v)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @return array{weekday: int, date: string, label: string, label_short: string}
     */
    public static function slot(int $weekday, string $date): array
    {
        return [
            'weekday' => $weekday,
            'date' => $date,
            'label' => self::WEEKDAY_NAMES[$weekday] ?? (string) $weekday,
            'label_short' => self::WEEKDAY_SHORT[$weekday] ?? (string) $weekday,
        ];
    }

    /**
     * @param  array<int>  $weekdays
     * @return array<int, array{weekday: int, date: string, label: string, label_short: string}>
     */
    private static function slotsForWeekdays(array $weekdays, Carbon $from, Carbon $to): array
    {
        $slots = [];
        foreach (self::normalizeWeekdays($weekdays) as $weekday) {
            $date = self::firstDateForWeekday($weekday, $from, $to);
            if ($date === null) {
                continue;
            }
            $slots[] = self::slot($weekday, $date);
        }

        return $slots;
    }

    private static function firstDateForWeekday(int $weekday, Carbon $from, Carbon $to): ?string
    {
        $cursor = $from->copy();
        $guard = 0;
        while ($cursor->lte($to) && $guard < 400) {
            if ((int) $cursor->dayOfWeek === $weekday) {
                return $cursor->toDateString();
            }
            $cursor->addDay();
            $guard++;
        }

        return null;
    }
}
