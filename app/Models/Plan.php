<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'description',
        'price_per_day',
        'is_specialized',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price_per_day' => 'decimal:2',
            'is_specialized' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(UserPlanSubscription::class);
    }
}
