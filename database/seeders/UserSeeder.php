<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Customer;
use App\Models\Perusahaan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Setup Roles
        $roles = ['staff', 'manager', 'supervisor', 'admin', 'customer'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        // 2. Setup Internal Users
        $internalUsers = [
            // Perusahaan 1
            ['name' => 'John Doe', 'email' => 'marketing@gmail.com', 'password' => '1234', 'role_internal' => 'staff',      'id_perusahaan' => 1],
            ['name' => 'Rose Doe', 'email' => 'manager@gmail.com', 'password' => '1234', 'role_internal' => 'manager',     'id_perusahaan' => 1],
            ['name' => 'Emi Rina', 'email' => 'direktur@gmail.com', 'password' => '1234', 'role_internal' => 'supervisor', 'id_perusahaan' => 1],

            // Perusahaan 2
            ['name' => 'Don 5', 'email' => 'don5@gmail.com', 'password' => '1234', 'role_internal' => 'staff',      'id_perusahaan' => 2],
            ['name' => 'Don 6', 'email' => 'don6@gmail.com', 'password' => '1234', 'role_internal' => 'manager',    'id_perusahaan' => 2],
            ['name' => 'Don 7', 'email' => 'don7@gmail.com', 'password' => '1234', 'role_internal' => 'supervisor', 'id_perusahaan' => 2],

            // Admin Global (Tanpa Perusahaan)
            ['name' => 'Super Admin', 'email' => 'admin@gmail.com', 'password' => '1234', 'role_internal' => 'admin', 'id_perusahaan' => null],

            // Perusahaan 3
            ['name' => 'Don 9',  'email' => 'don9@gmail.com',  'password' => '1234', 'role_internal' => 'staff',      'id_perusahaan' => 3],
            ['name' => 'Don 10', 'email' => 'don10@gmail.com', 'password' => '1234', 'role_internal' => 'manager',    'id_perusahaan' => 3],
            ['name' => 'Don 11', 'email' => 'don11@gmail.com', 'password' => '1234', 'role_internal' => 'supervisor', 'id_perusahaan' => 3],
        ];

        foreach ($internalUsers as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make($data['password']),
                    'id_perusahaan' => $data['id_perusahaan'] ?? null,
                    'role' => 'internal',
                    'role_internal' => $data['role_internal'],
                ]
            );

            $user->syncRoles([$data['role_internal']]);
        }

        // 3. Setup External Users
        $externalUsers = [
            [
                'user_name' => 'Budi Santoso', 
                'user_email' => 'client.a@gmail.com', 
                'password' => '1234',
                // Data untuk tabel customers
                'customer_data' => [
                    'id_customer' => 1,
                    'nama_perusahaan' => 'PT Client A Maju',
                    'type' => 'external',
                    'nama' => 'Budi Santoso', 
                    'email' => 'corporate.a@gmail.com',
                    'ownership' => 1, // ID Perusahaan pemilik customer ini
                ]
            ],
            [
                'user_name' => 'Sari Roti',    
                'user_email' => 'client.b@gmail.com', 
                'password' => '1234',
                // Data untuk tabel customers
                'customer_data' => [
                    'id_customer' => 2,
                    'nama_perusahaan' => 'CV Sari Roti Enak',
                    'type' => 'external',
                    'nama' => 'Sari Roti',
                    'email' => 'corporate.b@gmail.com',
                    'ownership' => 1, // ID Perusahaan pemilik customer ini
                ]
            ],
        ];

        foreach ($externalUsers as $data) {
            // STEP A: Buat atau Update Data Customer
            $custData = $data['customer_data'];
            
            $customer = Customer::updateOrCreate(
                ['id_customer' => $custData['id_customer']],
                [
                    'nama_perusahaan' => $custData['nama_perusahaan'],
                    'type' => $custData['type'],
                    'nama' => $custData['nama'],
                    'email' => $custData['email'],
                    'ownership' => $custData['ownership'],
                ]
            );

            // STEP B: Buat User External
            $user = User::updateOrCreate(
                ['email' => $data['user_email']],
                [
                    'name' => $data['user_name'],
                    'password' => Hash::make($data['password']),
                    
                    // PERBAIKAN DISINI: 
                    // Mengisi id_perusahaan user dengan ownership dari customer
                    'id_perusahaan' => $custData['ownership'], 
                    
                    'id_customer' => $customer->id_customer,
                    'role' => 'eksternal',
                    'role_internal' => null,
                ]
            );

            $user->syncRoles(['customer']);
        }
    }
}
