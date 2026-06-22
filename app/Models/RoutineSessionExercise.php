<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoutineSessionExercise extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'routine_session_id',
        'name',
        'detail',
        'video_url',
        'sort_order',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(RoutineSession::class, 'routine_session_id');
    }
}
