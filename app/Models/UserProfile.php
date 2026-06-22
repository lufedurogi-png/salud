<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Support\PublicStorageUrl;

class UserProfile extends Model
{
    protected $appends = ['avatar_url'];

    protected $fillable = [
        'user_id',
        'avatar_path',
        'weight_kg',
        'height_cm',
        'sex',
        'measures',
        'age',
        'metabolic_age',
        'weekday_color_mode',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getAvatarUrlAttribute(): ?string
    {
        if (! $this->avatar_path) {
            return null;
        }

        return PublicStorageUrl::for($this->avatar_path);
    }
}
