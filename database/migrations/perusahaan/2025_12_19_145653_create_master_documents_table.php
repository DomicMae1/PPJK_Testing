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
        Schema::create('master_documents', function (Blueprint $table) {
            // 1. Primary Key
            $table->id('id_dokumen');

            // 2. Foreign Keys (Relation)
            $table->unsignedBigInteger('id_spk')->nullable();
            $table->unsignedBigInteger('id_section')->nullable(); // Menghubungkan ke tabel master_sections

            // 3. Atribut Dokumen
            $table->boolean('attribute')->default(0); // 1 = mandatory, 0 = non-mandatory
            $table->string('upload_by')->nullable();  // role user: 'internal' atau 'external'

            // 4. File Utama
            $table->string('nama_file');
            $table->string('url_path_file')->nullable(); // Lokasi file di storage
            $table->text('description_file')->nullable();

            // 6. Validasi & Koreksi (Revisi)
            $table->boolean('verify')->default(false); // Status validasi: true/false

            $table->boolean('correction_attachment')->default(false); // Ada revisi lampiran?
            $table->string('correction_attachment_file')->nullable(); // File revisi dari internal
            $table->text('correction_description')->nullable();       // Catatan revisi

            $table->integer('kuota_revisi')->default(0); // Countdown jatah revisi (misal: 3x)

            // 7. Integrasi Eksternal
            $table->string('mapping_insw')->nullable(); // Nomor dokumen dari link INSW

            // 8. Log & Tracking
            $table->unsignedBigInteger('updated_by')->nullable(); // User ID
            $table->json('logs')->nullable(); // Array timestamps history

            $table->timestamps();

            // 9. Constraints
            // Relasi ke SPK
            $table->foreign('id_spk')
                ->references('id')->on('spk')
                ->onDelete('cascade');

            // Relasi ke Master Section (1. PPJK, 2. PIB, dll)
            $table->foreign('id_section')
                ->references('id_section')->on('master_sections')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_documents');
    }
};
