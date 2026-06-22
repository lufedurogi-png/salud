<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enum\UserType;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Models\UserLoginLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AdminAuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'alias' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'tipo' => UserType::ADMIN->value,
        ]);
        $user->roles()->syncWithoutDetaching([Role::where('name', 'admin')->value('id')]);

        $token = $user->createToken('admin-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'auth_type' => 'Bearer',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'tipo' => $user->tipo,
                'roles' => ['admin'],
            ],
        ], 201);
    }

    public function token(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password) || ! $user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Solo administradores pueden acceder.',
            ], 401);
        }

        $token = $user->createToken('admin-token')->plainTextToken;
        UserLoginLog::create([
            'user_id' => $user->id,
            'tipo' => $user->tipo,
            'logged_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'auth_type' => 'Bearer',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'tipo' => $user->tipo,
                'roles' => $user->roles()->pluck('name')->all(),
            ],
        ]);
    }
}
