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
        // Tabel ini ada di database Tenant (lokal), bukan Master
        Schema::create('document_statuses', function (Blueprint $table) {
            $table->id();
            
            // FK ke tabel document_trans
            $table->unsignedBigInteger('id_dokumen_trans');
            
            // Status (Varchar sesuai request)
            $table->string('status'); 
            
            // User ID yang melakukan aksi
            $table->string('by')->nullable();
            
            $table->timestamps();

            // Foreign Key Constraints
            // Asumsi tabel parent bernama 'document_trans'
            $table->foreign('id_dokumen_trans')
                  ->references('id')
                  ->on('document_trans')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dokumen_statuses');
    }
};