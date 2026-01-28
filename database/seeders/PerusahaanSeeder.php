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
            ['nama_perusahaan' => 'PT Alpha', 'subdomain' => 'alpha'],
            ['nama_perusahaan' => 'PT Beta',  'subdomain' => 'beta'],
            ['nama_perusahaan' => 'UD Cherry', 'subdomain' => 'cherry'],
            ['nama_perusahaan' => 'CV Delta', 'subdomain' => 'delta'],
            ['nama_perusahaan' => 'OD Bravo', 'subdomain' => 'bravo'],
        ];

        $appDomain = env('APP_DOMAIN');

        $appDomain = preg_replace('#^https?://#', '', $appDomain);

        foreach ($perusahaans as $data) {
            
            // 1. Buat Perusahaan
            $perusahaan = Perusahaan::create([
                'nama_perusahaan' => $data['nama_perusahaan'],
            ]);

            // 2. Buat Tenant
            $tenant = Tenant::create([
                'id' => $data['subdomain'],
                'perusahaan_id' => $perusahaan->id_perusahaan,
            ]);

            // 3. Logic Pembentukan Domain (Concatenation)
            // Rumus: Subdomain + Titik + AppDomain
            // Contoh: beta + . + customer-review-tako.test
            $customDomain = $data['subdomain'] . '.' . $appDomain;

            // 4. Simpan Domain
            $domainRecord = $tenant->domains()->create([
                'domain' => $customDomain,
            ]);

            // 5. Update Perusahaan dengan ID Domain
            $perusahaan->update([
                'id_domain' => $domainRecord->id,
            ]);
        }
    }
}
