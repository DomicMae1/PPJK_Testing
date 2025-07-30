<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Perusahaan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $roles = ['user', 'manager', 'direktur', 'lawyer'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName]);
        }

        // User + relasi ke perusahaan
        $users = [
            ['name' => 'don1', 'email' => 'don1@gmail.com', 'password' => '1234', 'role' => 'user',     'id_perusahaan' => 1],
            ['name' => 'don2', 'email' => 'don2@gmail.com', 'password' => '1234', 'role' => 'manager',  'id_perusahaan' => 1],
            ['name' => 'don3', 'email' => 'don3@gmail.com', 'password' => '1234', 'role' => 'direktur', 'id_perusahaan' => 1],
            ['name' => 'don4', 'email' => 'don4@gmail.com', 'password' => '1234', 'role' => 'lawyer',   'id_perusahaan' => 1],
            ['name' => 'don5', 'email' => 'don5@gmail.com', 'password' => '1234', 'role' => 'user',     'id_perusahaan' => 2],
            ['name' => 'don6', 'email' => 'don6@gmail.com', 'password' => '1234', 'role' => 'manager',  'id_perusahaan' => 2],
            ['name' => 'don7', 'email' => 'don7@gmail.com', 'password' => '1234', 'role' => 'direktur', 'id_perusahaan' => 2],
            ['name' => 'don8', 'email' => 'don8@gmail.com', 'password' => '1234', 'role' => 'admin'],
        ];

        foreach ($users as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => Hash::make($data['password']),
                    'id_perusahaan' => $data['id_perusahaan'] ?? null,
                ]
            );

            $user->syncRoles([$data['role']]);

            // Tambahkan ke relasi pivot perusahaan_user_roles
            if (!empty($data['id_perusahaan'])) {
                $user->companies()->syncWithoutDetaching([
                    $data['id_perusahaan'] => ['role' => $data['role']],
                ]);
            }
        }
    }
}
