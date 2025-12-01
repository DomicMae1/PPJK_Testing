<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Perusahaan;
use App\Models\Tenant; // Pastikan Model Tenant di-import

class PerusahaanSeeder extends Seeder
{
    public function run(): void
    {
        $perusahaans = [
            ['nama_perusahaan' => 'PT Alpha', 'notify_1' => 'ardonyunors147@gmail.com', 'subdomain' => 'alpha'],
            ['nama_perusahaan' => 'PT Beta', 'notify_1' => 'ardonyunors147@gmail.com', 'subdomain' => 'beta'],
            ['nama_perusahaan' => 'UD Cherry', 'notify_1' => 'ardonyunors147@gmail.com', 'subdomain' => 'cherry'],
            ['nama_perusahaan' => 'CV Delta', 'notify_1' => 'ardonyunors147@gmail.com', 'subdomain' => 'delta'],
            ['nama_perusahaan' => 'OD Bravo', 'notify_1' => 'ardonyunors147@gmail.com', 'subdomain' => 'bravo'],
        ];

        foreach ($perusahaans as $data) {
            // 1. Buat Data Bisnis (Perusahaan)
            $perusahaan = Perusahaan::create([
                'nama_perusahaan' => $data['nama_perusahaan'],
                'notify_1' => $data['notify_1'],
                // 'path_company_logo' => ... (opsional jika ada)
            ]);

            // 2. Buat Data System (Tenant)
            // Ini akan memicu pembuatan database jika mode multi-database aktif
            $tenant = Tenant::create([
                'id' => $data['subdomain'], // ID Tenant kita samakan dengan subdomain biar mudah (misal: 'alpha')
                'perusahaan_id' => $perusahaan->id, // RELASI PENTING: Sambungkan ke ID Perusahaan
            ]);

            // 3. Buat Data Routing (Domain)
            // Ini agar URL alpha.localhost bisa diakses
            $tenant->domains()->create([
                'domain' => $data['subdomain'] . '.' . ('customer-review-tako.test'), // Hasil: alpha.localhost
            ]);
        }
    }
}