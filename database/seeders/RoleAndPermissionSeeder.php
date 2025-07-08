<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Daftar model yang akan memiliki permission
        $models = [
            'master-customer',
        ];

        // Daftar action yang akan diterapkan pada setiap model
        $actions = [
            'create',
            'update',
            'delete',
            'view',
        ];

        // Buat permission secara dinamis
        foreach ($models as $model) {
            foreach ($actions as $action) {
                $permissionName = "{$action}-{$model}";
                Permission::firstOrCreate(['name' => $permissionName]);
            }
        }

        // Create roles
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $lawyerRole = Role::firstOrCreate(['name' => 'lawyer']);
        $editorRole = Role::firstOrCreate(['name' => 'manager']);
        $userRole = Role::firstOrCreate(['name' => 'user']);

        // Assign permissions to roles
        // Admin memiliki semua permission
        $adminRole->syncPermissions(Permission::all());

        // Editor memiliki permission terbatas
        $editorPermissions = [];
        foreach ($models as $model) {
            $editorPermissions[] = "create-{$model}";
            $editorPermissions[] = "update-{$model}";
            $editorPermissions[] = "delete-{$model}";
            $editorPermissions[] = "view-{$model}";
        }
        $editorRole->syncPermissions($editorPermissions);

        $lawyerPermissions = [];
        foreach ($models as $model) {
            $lawyerPermissions[] = "create-{$model}";
            $lawyerPermissions[] = "update-{$model}";
            $lawyerPermissions[] = "delete-{$model}";
            $lawyerPermissions[] = "view-{$model}";
        }
        $lawyerRole->syncPermissions($lawyerPermissions);

        // User hanya memiliki permission view
        $userPermissions = [];
        foreach ($models as $model) {
            $userPermissions[] = "create-{$model}";
            $userPermissions[] = "update-{$model}";
            $userPermissions[] = "view-{$model}";
        }
        $userRole->syncPermissions($userPermissions);
    }
}
