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
        // 1. Reset Cache Permission
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. Definisi Permissions
        $customPermissions = [
            // Email Permissions
            'create-email-manager-master-shipping',
            'create-email-direktur-master-shipping',
            'create-email-lawyer-master-shipping',

            // Role Specific View/Create
            'view-manager-master-shipping',
            'create-manager-master-shipping',
            'view-direktur-master-shipping',
            'create-direktur-master-shipping',
        ];

        foreach ($customPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // CRUD Permissions Otomatis
        $models = ['master-shipping']; // Tambahkan model lain di sini nanti
        $actions = ['create', 'update', 'delete', 'view'];

        foreach ($models as $model) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$action}-{$model}", 'guard_name' => 'web']);
            }
        }

        // 3. Definisi Roles (LENGKAP SESUAI USER SEEDER)
        $rolesList = [
            'admin',
            'staff',
            'manager',
            'supervisor',
            'customer',
        ];

        $rolesObj = [];
        foreach ($rolesList as $rName) {
            $rolesObj[$rName] = Role::firstOrCreate(['name' => $rName, 'guard_name' => 'web']);
        }

        // 4. Assign Permissions ke Role

        // Admin: Super Power
        $rolesObj['admin']->syncPermissions(Permission::all());

        // Staff
        $rolesObj['staff']->syncPermissions([
            'create-master-shipping',
            'update-master-shipping',
            'view-master-shipping',
        ]);

        // Manager
        $rolesObj['manager']->syncPermissions([
            'create-master-shipping',
            'view-master-shipping',
            'view-manager-master-shipping',
            'create-manager-master-shipping',
            'create-email-manager-master-shipping',
        ]);

        // Direktur
        $rolesObj['supervisor']->syncPermissions([
            'create-master-shipping',
            'view-master-shipping',
            'view-direktur-master-shipping',
            'create-direktur-master-shipping',
            'create-email-direktur-master-shipping',
        ]);

        // Customer
        $rolesObj['customer']->syncPermissions([
            'create-master-shipping',
            'update-master-shipping',
            'view-master-shipping',
        ]);

        // 5. Logic Tambahan: Pastikan semua role punya view-master-customer
        $viewPerm = Permission::where('name', 'view-master-shipping')->first();
        foreach (Role::all() as $role) {
            if (!$role->hasPermissionTo('view-master-shipping')) {
                $role->givePermissionTo($viewPerm);
            }
        }
    }
}
