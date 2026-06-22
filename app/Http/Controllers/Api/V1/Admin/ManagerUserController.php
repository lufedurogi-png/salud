<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enum\UserType;
use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ManagerUserController extends Controller
{
    public function getTypesUser()
    {
        return response()->json([
            ['id' => 1, 'label' => 'Admin'],
            ['id' => 2, 'label' => 'Cliente'],
        ]);
    }

    public function getPermissions()
    {
        return response()->json(Permission::query()->get(['name as value', 'label']));
    }

    public function index(Request $request)
    {
        $search = (string) $request->query('search', '');
        $role = (string) $request->query('role', '');
        $permission = (string) $request->query('permission', '');

        $query = User::query()->with(['roles', 'permissions']);
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($role !== '') {
            $query->whereHas('roles', fn ($q) => $q->where('name', $role));
        }
        if ($permission !== '') {
            $query->whereHas('permissions', fn ($q) => $q->where('name', $permission));
        }

        $users = $query->orderBy('id', 'desc')->get()->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'tipo' => $u->tipo,
            'roles' => $u->roles->pluck('name')->values(),
            'permissions' => $u->permissions->pluck('name')->values(),
        ]);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
            'type' => 'required|integer|in:1,2',
            'adminPassword' => 'required|string',
        ]);

        if (! Hash::check($data['adminPassword'], $request->user()->password)) {
            return response()->json(['success' => false, 'message' => 'Contrasena admin incorrecta.'], 422);
        }

        $user = User::create([
            'name' => $data['name'],
            'alias' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'tipo' => $data['type'],
        ]);

        $roleName = $data['type'] === UserType::ADMIN->value ? 'admin' : 'customer';
        $roleId = Role::where('name', $roleName)->value('id');
        if ($roleId) {
            $user->roles()->syncWithoutDetaching([$roleId]);
        }

        $this->assignDefaultPermissions($user, (int) $data['type']);

        if ((int) $data['type'] === UserType::CUSTOMER->value) {
            UserProfile::query()->firstOrCreate(['user_id' => $user->id]);
        }

        return response()->json(['success' => true, 'message' => 'Usuario creado.'], 201);
    }

    public function update(Request $request, int $usuarioId)
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:120',
            'email' => 'nullable|email|max:190|unique:users,email,'.$usuarioId,
            'adminPassword' => 'required|string',
        ]);
        if (! Hash::check($data['adminPassword'], $request->user()->password)) {
            return response()->json(['success' => false, 'message' => 'Contrasena admin incorrecta.'], 422);
        }

        $user = User::findOrFail($usuarioId);
        $user->fill(collect($data)->only(['name', 'email'])->toArray())->save();

        return response()->json(['success' => true, 'message' => 'Usuario actualizado.']);
    }

    public function setRole(Request $request, int $usuarioId)
    {
        $data = $request->validate([
            'tipoUsuario' => 'required|integer|in:1,2',
            'adminPassword' => 'required|string',
        ]);
        if (! Hash::check($data['adminPassword'], $request->user()->password)) {
            return response()->json(['success' => false, 'message' => 'Contrasena admin incorrecta.'], 422);
        }

        $user = User::findOrFail($usuarioId);
        $roleName = $data['tipoUsuario'] === UserType::ADMIN->value ? 'admin' : 'customer';
        $roleId = Role::where('name', $roleName)->value('id');
        if ($roleId) {
            $user->roles()->syncWithoutDetaching([$roleId]);
        }
        $user->tipo = $data['tipoUsuario'];
        $user->save();

        $this->assignDefaultPermissions($user, (int) $data['tipoUsuario']);

        if ((int) $data['tipoUsuario'] === UserType::CUSTOMER->value) {
            UserProfile::query()->firstOrCreate(['user_id' => $user->id]);
        }

        return response()->json(['success' => true, 'message' => 'Rol asignado.']);
    }

    public function removeRole(Request $request, int $usuarioId)
    {
        $data = $request->validate([
            'role' => 'required|string',
            'adminPassword' => 'required|string',
        ]);
        if (! Hash::check($data['adminPassword'], $request->user()->password)) {
            return response()->json(['success' => false, 'message' => 'Contrasena admin incorrecta.'], 422);
        }

        $user = User::findOrFail($usuarioId);
        $roleId = Role::where('name', $data['role'])->value('id');
        if ($roleId) {
            $user->roles()->detach($roleId);
        }
        return response()->json(['success' => true, 'message' => 'Rol removido.']);
    }

    public function destroy(Request $request, int $usuarioId)
    {
        $data = $request->validate(['adminPassword' => 'required|string']);
        if (! Hash::check($data['adminPassword'], $request->user()->password)) {
            return response()->json(['success' => false, 'message' => 'Contrasena admin incorrecta.'], 422);
        }
        if ((int) $request->user()->id === $usuarioId) {
            return response()->json(['success' => false, 'message' => 'No puedes eliminar tu usuario.'], 422);
        }
        User::findOrFail($usuarioId)->delete();

        return response()->json(['success' => true, 'message' => 'Usuario eliminado.']);
    }

    public function resetPassword(Request $request, int $usuarioId)
    {
        $data = $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
            'adminPassword' => 'required|string',
        ]);
        if (! Hash::check($data['adminPassword'], $request->user()->password)) {
            return response()->json(['success' => false, 'message' => 'Contrasena admin incorrecta.'], 422);
        }
        User::findOrFail($usuarioId)->update(['password' => $data['password']]);

        return response()->json(['success' => true, 'message' => 'Contrasena restablecida.']);
    }

    public function grantPermission(Request $request, int $usuarioId)
    {
        $data = $request->validate([
            'permission' => 'required|string',
            'adminPassword' => 'required|string',
        ]);
        if (! Hash::check($data['adminPassword'], $request->user()->password)) {
            return response()->json(['success' => false, 'message' => 'Contrasena admin incorrecta.'], 422);
        }
        $permissionId = Permission::where('name', $data['permission'])->value('id');
        if ($permissionId) {
            User::findOrFail($usuarioId)->permissions()->syncWithoutDetaching([$permissionId]);
        }
        return response()->json(['success' => true, 'message' => 'Permiso asignado.']);
    }

    public function revokePermission(Request $request, int $usuarioId)
    {
        $data = $request->validate([
            'permission' => 'required|string',
            'adminPassword' => 'required|string',
        ]);
        if (! Hash::check($data['adminPassword'], $request->user()->password)) {
            return response()->json(['success' => false, 'message' => 'Contrasena admin incorrecta.'], 422);
        }
        $permissionId = Permission::where('name', $data['permission'])->value('id');
        if ($permissionId) {
            User::findOrFail($usuarioId)->permissions()->detach($permissionId);
        }
        return response()->json(['success' => true, 'message' => 'Permiso removido.']);
    }

    /** Permisos por defecto según tipo (igual que registro público y DatabaseSeeder). */
    private function assignDefaultPermissions(User $user, int $type): void
    {
        $permissionIds = $type === UserType::ADMIN->value
            ? Permission::query()->pluck('id')->all()
            : Permission::query()
                ->whereIn('name', ['view profile', 'edit profile'])
                ->pluck('id')
                ->all();

        if ($permissionIds !== []) {
            $user->permissions()->syncWithoutDetaching($permissionIds);
        }
    }
}
