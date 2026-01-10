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
        Schema::create('section_trans', function (Blueprint $table) {
            // 1. Primary Key disesuaikan
            $table->id();

            $table->unsignedBigInteger('id_section')->nullable();
            $table->unsignedBigInteger('id_spk')->nullable();

            // 2. Data Utama
            $table->string('section_name');
            $table->integer('section_order')->default(0); // Untuk mengatur urutan tampilan

            // 3. Konfigurasi Waktu
            $table->boolean('deadline')->default(false); // status=true/false

            // SLA (Service Level Agreement) - Timer Internal
            $table->string('sla')->nullable();

            $table->timestamps();
            $table->foreign('id_spk')
                  ->references('id')->on('spk')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('section_trans');
    }
};
