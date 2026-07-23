<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoutineClientComment extends Model
{
    protected $fillable = [
        'user_id',
        'comment_date',
        'weekday',
        'body',
    ];

    protected function casts(): array
    {
        return [
            'comment_date' => 'date',
            'weekday' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
