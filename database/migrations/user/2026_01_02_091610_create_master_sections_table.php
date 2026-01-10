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
        Schema::connection('tako-user')->create('master_sections', function (Blueprint $table) {
            // 1. Primary Key disesuaikan
            $table->id('id_section');

            // 2. Data Utama
            $table->string('section_name');
            $table->integer('section_order')->default(0); // Untuk mengatur urutan tampilan

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-user')->dropIfExists('master_sections');
    }
};
