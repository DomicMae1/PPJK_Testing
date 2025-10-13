<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Perusahaan;

class PerusahaanSeeder extends Seeder
{
    public function run(): void
    {
        $perusahaans = [
            ['nama_perusahaan' => 'PT Alpha', 'notify_1' => 'ardonyunors147@gmail.com'],
            ['nama_perusahaan' => 'PT Beta', 'notify_1' => 'ardonyunors147@gmail.com'],
            ['nama_perusahaan' => 'UD Cherry', 'notify_1' => 'ardonyunors147@gmail.com'],
            ['nama_perusahaan' => 'CV Delta', 'notify_1' => 'ardonyunors147@gmail.com'],
        ];

        foreach ($perusahaans as $data) {
            Perusahaan::updateOrCreate(
                ['nama_perusahaan' => $data['nama_perusahaan']], 
                [
                    'notify_1' => $data['notify_1'],
                ]
            );
        }
    }
}
