<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoutineCompletionLog extends Model
{
    protected $fillable = [
        'user_id',
        'routine_day_id',
        'weekday',
        'completed_on',
        'is_completed',
    ];

    protected function casts(): array
    {
        return [
            'completed_on' => 'date',
            'is_completed' => 'boolean',
            'weekday' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function routineDay(): BelongsTo
    {
        return $this->belongsTo(RoutineDay::class);
    }
}

