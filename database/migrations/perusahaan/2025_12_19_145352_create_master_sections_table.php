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
        Schema::create('master_sections', function (Blueprint $table) {
            // 1. Primary Key disesuaikan
            $table->id('id_section');

            // 2. Data Utama
            $table->string('section_name');
            $table->integer('section_order')->default(0); // Untuk mengatur urutan tampilan

            // 3. Konfigurasi Waktu
            $table->boolean('deadline')->default(false); // status=true/false

            // SLA (Service Level Agreement) - Timer Internal
            $table->string('sla')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_sections');
    }
};
