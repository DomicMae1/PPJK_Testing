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
        Schema::create('user_company', function (Blueprint $table) {
            $table->id();
            
            // 1. Kolom Foreign Key (FK)
            $table->unsignedBigInteger('id_user');
            $table->unsignedBigInteger('id_perusahaan');

            $table->timestamps();

            // 2. Index & Constraints
            
            $table->index('id_user');

            $table->foreign('id_perusahaan')
                  ->references('id_perusahaan') 
                  ->on('perusahaan')
                  ->onDelete('cascade'); // Jika perusahaan dihapus, data di sini ikut terhapus
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_company');
    }
};
