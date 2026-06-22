<?php

namespace Database\Seeders;

use App\Enum\UserType;
use App\Models\Permission;
use App\Models\Plan;
use App\Models\Role;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $roles = [
            'admin' => 'Administrador',
            'customer' => 'Cliente',
        ];
        foreach ($roles as $name => $label) {
            Role::query()->firstOrCreate(['name' => $name], ['label' => $label]);
        }

        $permissions = [
            'view profile' => 'Ver perfil',
            'edit profile' => 'Editar perfil',
            'manage users' => 'Gestionar usuarios',
            'manage payment methods' => 'Gestionar metodos de pago',
            'manage clients' => 'Gestionar clientes',
            'manage plans' => 'Gestionar paquetes',
            'view dashboard' => 'Ver dashboard',
        ];
        foreach ($permissions as $name => $label) {
            Permission::query()->firstOrCreate(['name' => $name], ['label' => $label]);
        }

        $admin = User::query()->firstOrCreate([
            'email' => 'admin@salud.local',
        ], [
            'name' => 'Administrador',
            'alias' => 'Admin',
            'password' => 'Admin1234',
            'tipo' => UserType::ADMIN->value,
        ]);
        $admin->roles()->syncWithoutDetaching([Role::where('name', 'admin')->value('id')]);
        $admin->permissions()->syncWithoutDetaching(
            Permission::query()->pluck('id')->all()
        );

        $customer = User::query()->firstOrCreate([
            'email' => 'cliente@salud.local',
        ], [
            'name' => 'Cliente Demo',
            'alias' => 'Cliente',
            'password' => 'Cliente1234',
            'tipo' => UserType::CUSTOMER->value,
        ]);
        UserProfile::query()->firstOrCreate(['user_id' => $customer->id]);
        $customer->roles()->syncWithoutDetaching([Role::where('name', 'customer')->value('id')]);
        $customer->permissions()->syncWithoutDetaching(
            Permission::query()->whereIn('name', ['view profile', 'edit profile'])->pluck('id')->all()
        );

        Plan::query()->firstOrCreate(
            ['name' => 'Plan de entrenamiento'],
            ['description' => 'Plan base de entrenamiento', 'price_per_day' => 250, 'is_specialized' => false, 'is_active' => true]
        );
        Plan::query()->firstOrCreate(
            ['name' => 'Paquete fuerza'],
            ['description' => 'Enfoque de fuerza e hipertrofia', 'price_per_day' => 500, 'is_specialized' => true, 'is_active' => true]
        );
        Plan::query()->firstOrCreate(
            ['name' => 'Paquete running'],
            ['description' => 'Plan especializado de running', 'price_per_day' => 500, 'is_specialized' => true, 'is_active' => true]
        );
    }
}
