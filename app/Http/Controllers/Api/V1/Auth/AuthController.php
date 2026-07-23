<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enum\UserType;
use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserLoginLog;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'last_name' => 'nullable|string|max:120',
            'email' => 'required|email|max:190|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'last_name' => $data['last_name'] ?? null,
            'alias' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'tipo' => UserType::CUSTOMER->value,
        ]);

        UserProfile::create(['user_id' => $user->id]);
        $user->roles()->syncWithoutDetaching([Role::where('name', 'customer')->value('id')]);
        $user->permissions()->syncWithoutDetaching(
            Permission::query()->whereIn('name', ['view profile', 'edit profile'])->pluck('id')->all()
        );

        $token = $user->createToken('client-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'auth_type' => 'Bearer',
            'data' => $this->mapUser($user),
        ], 201);
    }

    public function generateToken(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Las credenciales son incorrectas.',
            ], 401);
        }

        $token = $user->createToken($user->tipo === UserType::ADMIN->value ? 'admin-token' : 'client-token')->plainTextToken;
        UserLoginLog::create([
            'user_id' => $user->id,
            'tipo' => $user->tipo,
            'logged_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'auth_type' => 'Bearer',
            'data' => $this->mapUser($user),
        ]);
    }

    public function profile(Request $request)
    {
        $user = $request->user()->load(['roles', 'permissions', 'profile']);

        return response()->json([
            'success' => true,
            'data' => $this->mapUser($user),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'alias' => 'nullable|string|max:120',
        ]);

        $user = $request->user();
        if (array_key_exists('alias', $data)) {
            $user->alias = $data['alias'];
            $user->save();
        }

        return response()->json([
            'success' => true,
            'data' => $this->mapUser($user->load(['roles', 'permissions', 'profile'])),
        ]);
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'errors' => ['current_password' => ['La contraseña actual no coincide.']],
            ], 422);
        }

        $user->update(['password' => $data['password']]);

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada correctamente.',
        ]);
    }

    public function revokeTokens(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesion cerrada.',
        ]);
    }

    private function mapUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'alias' => $user->alias,
            'tipo' => $user->tipo,
            'roles' => $user->roles->pluck('name')->all(),
            'permissions' => $user->permissions->pluck('name')->all(),
            'profile' => [
                'weight_kg' => $user->profile?->weight_kg,
                'height_cm' => $user->profile?->height_cm,
                'sex' => $user->profile?->sex,
                'measures' => $user->profile?->measures,
                'age' => $user->profile?->age,
                'metabolic_age' => $user->profile?->metabolic_age,
                'avatar_url' => $user->profile?->avatar_url,
            ],
            'avatar_url' => $user->profile?->avatar_url,
        ];
    }
}
