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
            ['nama' => 'PT Alpha', 'subdomain' => 'alpha'],
            ['nama' => 'PT Beta',  'subdomain' => 'beta'],
            ['nama' => 'UD Cherry', 'subdomain' => 'cherry'],
            ['nama' => 'CV Delta', 'subdomain' => 'delta'],
            ['nama' => 'OD Bravo', 'subdomain' => 'bravo'],
        ];

        foreach ($perusahaans as $data) {
            // 1. Buat Data Bisnis (Perusahaan)
            // Perhatikan Case Sensitive: 'Nama_perusahaan' sesuai migrasi
            $perusahaan = Perusahaan::firstOrCreate(
                ['nama_perusahaan' => $data['nama']], // Kunci pencarian
                [] // Data tambahan jika create (kosong)
            );

            // 2. Buat Data System (Tenant)
            // Stancl Tenancy akan otomatis membuat Database baru di background
            $tenant = Tenant::firstOrCreate(
                ['id' => $data['subdomain']],
                ['perusahaan_id' => $perusahaan->id_perusahaan]
            );

            // Pastikan relasi update jika tenant sudah ada sebelumnya
            if ($tenant->perusahaan_id !== $perusahaan->id_perusahaan) {
                $tenant->update(['perusahaan_id' => $perusahaan->id_perusahaan]);
            }

            // 3. Buat Domain
            $appDomain = env('APP_DOMAIN', 'localhost'); // Default localhost jika env kosong

            $fullDomain = $data['subdomain'] . '.' . $appDomain;

            // Cek apakah domain sudah terdaftar di tenant ini
            $tenant->domains()->firstOrCreate([
                'domain' => $fullDomain
            ]);
        }
    }
}
