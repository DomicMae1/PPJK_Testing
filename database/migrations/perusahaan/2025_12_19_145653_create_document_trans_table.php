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
        Schema::create('document_trans', function (Blueprint $table) {
            // 1. Primary Key (id prefix PK)
            $table->id(); 

            // 2. Foreign Key: id_dokumen (Mengacu ke Master Document)
            $table->unsignedBigInteger('id_dokumen')->nullable();

            // 3. Foreign Key: id_spk
            $table->unsignedBigInteger('id_spk')->nullable();

            // 4. Foreign Key: id_section
            $table->unsignedBigInteger('id_section')->nullable();

            // 5. Data User & File
            $table->boolean('is_internal')->default(false);
            $table->string('nama_file');
            $table->string('url_path_file')->nullable(); // Lokasi file di storage

            // 6. Tracking Logs
            $table->timestamps(); // created_at, updated_at

            // 7. Validasi & Koreksi
            $table->boolean('verify')->nullable(); // Status validasi
            $table->boolean('correction_attachment')->default(false); // Flag ada revisi file
            $table->string('correction_attachment_file')->nullable(); // Path file revisi
            $table->text('correction_description')->nullable();       // Catatan revisi
            $table->integer('kuota_revisi')->default(0);

            // 8. Integrasi
            $table->string('mapping_insw')->nullable();
            $table->string('sla_document')->nullable();

            $table->foreign('id_dokumen')
                ->references('id_dokumen') // Referensi ke kolom 'id_dokumen' (bukan 'id')
                ->on('master_documents_trans') // Referensi ke tabel 'master_documents_trans' (pakai 's')
                ->onDelete('cascade');

            // Relasi ke SPK (Table Lokal Tenant)
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
        Schema::dropIfExists('document_trans');
    }
};