<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permissions): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $permissionNames = array_filter(array_map('trim', explode('|', $permissions)));
        if ($permissionNames === []) {
            return response()->json(['message' => 'Configuracion de permisos invalida.'], 500);
        }

        foreach ($permissionNames as $permission) {
            if ($user->hasPermissionTo($permission)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'No autorizado para este recurso.'], 403);
    }
}
