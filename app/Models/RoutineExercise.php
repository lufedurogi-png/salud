<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoutineExercise extends Model
{
    protected $fillable = ['routine_day_id', 'name', 'detail', 'video_url', 'sort_order'];

    public function routineDay(): BelongsTo
    {
        return $this->belongsTo(RoutineDay::class);
    }
}
