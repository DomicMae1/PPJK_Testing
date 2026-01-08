<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

class DropAllTables extends Command
{
    protected $signature = 'db:drop-all';
    protected $description = 'Menghapus Database Master dan Semua Database Tenant (Reset Total)';

    public function handle()
    {
        if (app()->environment('production')) {
            $this->error('JANGAN JALANKAN INI DI PRODUCTION!');
            return;
        }

        $this->alert('PERINGATAN: SEMUA DATA DI DATABASE AKAN DIHAPUS PERMANEN!');
        
        if (!$this->confirm('Yakin ingin mereset total database master & tenant?', false)) {
            $this->info('Dibatalkan.');
            return;
        }

        $masterDbName = env('DB_DATABASE', 'mastertako_ppjk'); 
        
        // --- PERBAIKAN DISINI ---
        // Kita ambil prefix dari config tenancy, atau gunakan 'tenant' sebagai default
        // Berdasarkan error Anda, nama DB adalah 'tenantalpha', jadi prefixnya 'tenant'
        $configPrefix = config('tenancy.database.prefix', 'tenant'); 
        
        // Tambahkan % untuk wildcard SQL
        $tenantPrefix = $configPrefix . '%'; 

        try {
            // 1. Koneksi Maintenance
            Config::set('database.connections.maintenance', [
                'driver'   => 'pgsql',
                'host'     => env('DB_HOST', '127.0.0.1'),
                'port'     => env('DB_PORT', '5432'),
                'database' => 'postgres',
                'username' => env('DB_USERNAME', 'postgres'),
                'password' => env('DB_PASSWORD', ''),
                'charset'  => 'utf8',
                'prefix'   => '',
                'schema'   => 'public',
            ]);

            // 2. Cari Database Tenant
            $this->info("Mencari database tenant dengan pattern '$tenantPrefix'...");
            
            $tenantDbs = DB::connection('maintenance')
                ->select("SELECT datname FROM pg_database WHERE datname LIKE ?", [$tenantPrefix]);

            // 3. Hapus Database Tenant
            if (count($tenantDbs) > 0) {
                foreach ($tenantDbs as $db) {
                    $name = $db->datname;
                    // Skip jika database master tidak sengaja kena filter (safety check)
                    if ($name === $masterDbName) continue; 

                    $this->comment("Menghapus tenant: $name");
                    DB::connection('maintenance')->statement("DROP DATABASE IF EXISTS \"$name\" WITH (FORCE);");
                }
                $this->info('✅ Semua database tenant berhasil dihapus.');
            } else {
                $this->info('ℹ️ Tidak ada database tenant ditemukan.');
            }

            // 4. Hapus Database Master
            $this->comment("Menghapus master: $masterDbName");
            DB::connection('maintenance')->statement("DROP DATABASE IF EXISTS \"$masterDbName\" WITH (FORCE);");
            
            // 5. Buat Ulang Database Master Kosong
            $this->info("Membuat ulang database master kosong...");
            DB::connection('maintenance')->statement("CREATE DATABASE \"$masterDbName\";");

            $this->newLine();
            $this->info('🎉 RESET BERHASIL! Database bersih.');
            $this->info('Langkah selanjutnya jalankan: php artisan migrate --seed');

        } catch (\Exception $e) {
            $this->error('Terjadi Kesalahan: ' . $e->getMessage());
        }
    }
}