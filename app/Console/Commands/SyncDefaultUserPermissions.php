<?php

namespace App\Console\Commands;

use App\Enum\UserType;
use App\Models\Permission;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Console\Command;

class SyncDefaultUserPermissions extends Command
{
    protected $signature = 'users:sync-default-permissions';

    protected $description = 'Asigna permisos por defecto a usuarios que no tienen ninguno';

    public function handle(): int
    {
        $customerPermIds = Permission::query()
            ->whereIn('name', ['view profile', 'edit profile'])
            ->pluck('id')
            ->all();
        $adminPermIds = Permission::query()->pluck('id')->all();
        $fixed = 0;

        User::query()->with('permissions')->each(function (User $user) use ($customerPermIds, $adminPermIds, &$fixed) {
            if ($user->permissions->isNotEmpty()) {
                return;
            }

            $ids = (int) $user->tipo === UserType::ADMIN->value ? $adminPermIds : $customerPermIds;
            if ($ids !== []) {
                $user->permissions()->syncWithoutDetaching($ids);
                $fixed++;
            }

            if ((int) $user->tipo === UserType::CUSTOMER->value) {
                UserProfile::query()->firstOrCreate(['user_id' => $user->id]);
            }
        });

        $this->info("Usuarios actualizados: {$fixed}");

        return self::SUCCESS;
    }
}
