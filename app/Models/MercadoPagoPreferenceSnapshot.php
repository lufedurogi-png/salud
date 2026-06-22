<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MercadoPagoPreferenceSnapshot extends Model
{
    protected $table = 'mercadopago_preference_snapshots';
    protected $primaryKey = 'preference_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'preference_id',
        'user_id',
        'subscription_id',
        'snapshot',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(UserPlanSubscription::class, 'subscription_id');
    }
}

