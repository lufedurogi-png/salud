<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserStoreDiscount extends Model
{
    protected $fillable = [
        'user_id',
        'plan_id',
        'discount_percent',
        'is_active',
        'notes',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'integer',
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

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function isFree(): bool
    {
        return (int) $this->discount_percent >= 100;
    }
}
