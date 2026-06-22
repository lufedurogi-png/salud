<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPlanSubscription extends Model
{
    protected $fillable = [
        'user_id',
        'plan_id',
        'days_per_week',
        'starts_at',
        'ends_at',
        'paid_days',
        'paid_day_slots',
        'payment_method',
        'payment_reference',
        'payment_status',
        'payment_meta',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'ends_at' => 'date',
            'paid_days' => 'array',
            'paid_day_slots' => 'array',
            'payment_meta' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
