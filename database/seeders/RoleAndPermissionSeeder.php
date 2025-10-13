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
        $customPermissions = [
            // Email Permissions
            'create-email-manager-master-customer',
            'create-email-direktur-master-customer',
            'create-email-lawyer-master-customer',

            // Manager Permissions
            'view-manager-master-customer',
            'create-manager-master-customer',

            // Direktur Permissions
            'view-direktur-master-customer',
            'create-direktur-master-customer',

            // Lawyer Permissions
            'view-lawyer-master-customer',
            'create-lawyer-master-customer',
        ];

        foreach ($customPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        $models = [
            'master-customer',
        ];

        $actions = [
            'create',
            'update',
            'delete',
            'view',
        ];

        foreach ($models as $model) {
            foreach ($actions as $action) {
                $permissionName = "{$action}-{$model}";
                Permission::firstOrCreate(['name' => $permissionName]);
            }
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $lawyerRole = Role::firstOrCreate(['name' => 'lawyer']);
        $editorRole = Role::firstOrCreate(['name' => 'manager']);
        $userRole = Role::firstOrCreate(['name' => 'user']);

        $adminRole->syncPermissions(Permission::all());

        $editorRole->syncPermissions([
            'create-master-customer',
            'view-master-customer',
            'view-manager-master-customer',
            'create-manager-master-customer',
            'create-email-manager-master-customer',
        ]);

        $direkturRole = Role::firstOrCreate(['name' => 'direktur']);
        $direkturRole->syncPermissions([
            'create-master-customer',
            'view-master-customer',
            'view-direktur-master-customer',
            'create-direktur-master-customer',
            'create-email-direktur-master-customer',
        ]);

        $lawyerRole->syncPermissions([
            'view-master-customer',
            'view-lawyer-master-customer',
            'create-lawyer-master-customer',
            'create-email-lawyer-master-customer',
        ]);

        $userRole->syncPermissions([
            'create-master-customer',
            'update-master-customer',
            'view-master-customer',
        ]);

        $allRoles = Role::all();
        $viewMasterCustomerPermission = Permission::firstOrCreate(['name' => 'view-master-customer']);

        foreach ($allRoles as $role) {
            if (!$role->hasPermissionTo('view-master-customer')) {
                $role->givePermissionTo($viewMasterCustomerPermission);
            }
        }

        // // Editor memiliki permission terbatas
        // $editorPermissions = [];
        // foreach ($models as $model) {
        //     $editorPermissions[] = "create-{$model}";
        //     $editorPermissions[] = "update-{$model}";
        //     $editorPermissions[] = "delete-{$model}";
        //     $editorPermissions[] = "view-{$model}";
        // }
        // $editorRole->syncPermissions($editorPermissions);

        // $lawyerPermissions = [];
        // foreach ($models as $model) {
        //     $lawyerPermissions[] = "create-{$model}";
        //     $lawyerPermissions[] = "update-{$model}";
        //     $lawyerPermissions[] = "delete-{$model}";
        //     $lawyerPermissions[] = "view-{$model}";
        // }
        // $lawyerRole->syncPermissions($lawyerPermissions);

        // // User hanya memiliki permission view
        // $userPermissions = [];
        // foreach ($models as $model) {
        //     $userPermissions[] = "create-{$model}";
        //     $userPermissions[] = "update-{$model}";
        //     $userPermissions[] = "view-{$model}";
        // }
        // $userRole->syncPermissions($userPermissions);
    }
}
