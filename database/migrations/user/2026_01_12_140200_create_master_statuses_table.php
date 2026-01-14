<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Pastikan menggunakan koneksi 'tako-user' jika ini data master
        Schema::connection('tako-user')->create('master_statuses', function (Blueprint $table) {
            // id_status sebagai Primary Key
            $table->id('id_status'); 
            
            // Kolom index (nama status/kode status)
            // Menggunakan tipe string (misal: 'DRAFT', 'SUBMITTED')
            $table->string('priority'); 
            
            // Kolom priority untuk urutan (Integer)
            $table->integer('index')->default(0);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-user')->dropIfExists('master_statuses');
    }
};