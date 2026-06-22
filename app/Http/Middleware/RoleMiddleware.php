<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $roles): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $roleNames = array_filter(array_map('trim', explode('|', $roles)));
        if ($roleNames === []) {
            return response()->json(['message' => 'Configuracion de roles invalida.'], 500);
        }

        if (! $user->hasAnyRole($roleNames)) {
            return response()->json(['message' => 'No autorizado para este recurso.'], 403);
        }

        return $next($request);
    }
}
