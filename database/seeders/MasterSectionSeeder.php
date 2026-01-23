<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MasterSectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();

        $sections = [
            [
                'id_section'    => 1,
                'section_name'  => 'PPJK Document Request',
                'section_order' => 1,
                'created_at'    => $now,
                'updated_at'    => $now,
                'is_penjaluran' => false,
            ],
            [
                'id_section'    => 2,
                'section_name'  => 'Shipping Line',
                'section_order' => 2,
                'created_at'    => $now,
                'updated_at'    => $now,
                'is_penjaluran' => false,
            ],
            [
                'id_section'    => 3,
                'section_name'  => 'Pib/Peb',
                'section_order' => 3,
                'created_at'    => $now,
                'updated_at'    => $now,
                'is_penjaluran' => false,
            ],
            [
                'id_section'    => 4,
                'section_name'  => 'Bill Payment',
                'section_order' => 4,
                'created_at'    => $now,
                'updated_at'    => $now,
                'is_penjaluran' => false,
            ],
            [
                'id_section'    => 5,
                'section_name'  => 'Result',
                'section_order' => 5,
                'created_at'    => $now,
                'updated_at'    => $now,
                'is_penjaluran' => false,
            ],
            [
                'id_section'    => 6,
                'section_name'  => 'Additional Document',
                'section_order' => 6,
                'created_at'    => $now,
                'updated_at'    => $now,
                'is_penjaluran' => false,
            ],
        ];

        // 1. Matikan Foreign Key Check sementara (untuk menghindari error saat truncate)
        // Karena koneksi 'tako-user' mungkin beda driver, ini cara aman umum untuk PostgreSQL/MySQL
        // Jika murni Postgres, biasanya pakai CASCADE di truncate, tapi ini lebih general
        
        // Pilih table target dengan koneksi yang benar
        $table = DB::connection('tako-user')->table('master_sections');

        // 2. Bersihkan data lama (Truncate) agar ID reset dan tidak duplikat
        // Kita gunakan try-catch atau force delete jika truncate gagal karena FK
        try {
            // Khusus PostgreSQL, truncate cascade diperlukan jika ada tabel lain yang mereferensikan ini
            DB::connection('tako-user')->statement('TRUNCATE TABLE master_sections RESTART IDENTITY CASCADE');
        } catch (\Exception $e) {
            // Fallback jika database bukan Postgres atau syntax error, pakai delete biasa
            $table->delete();
        }

        // 3. Insert Data Baru
        $table->insert($sections);
    }
}