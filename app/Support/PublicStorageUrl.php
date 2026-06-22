<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class PublicStorageUrl
{
    public static function for(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $relative = '/storage/'.ltrim($path, '/');

        if (! app()->runningInConsole() && request()) {
            return rtrim(request()->getSchemeAndHttpHost(), '/').$relative;
        }

        return Storage::disk('public')->url($path);
    }
}
