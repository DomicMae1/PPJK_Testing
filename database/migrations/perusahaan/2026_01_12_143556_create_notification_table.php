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
        Schema::create('notification', function (Blueprint $table) {
            // 1. Primary Key Custom 'id_notifikasi'
            $table->id('id_notification');

            // 2. Foreign Keys
            $table->unsignedBigInteger('id_spk');
            $table->unsignedBigInteger('id_section')->nullable();
            $table->unsignedBigInteger('id_dokumen')->nullable(); // Nullable jika notif umum SPK

            // 3. Data Kolom
            $table->json('data'); // Contoh: 'uploaded', 'rejected', 'approved'
            $table->enum('role', ['internal', 'eksternal']);
            
            // 4. User Info
            $table->unsignedBigInteger('send_to')->nullable(); // User yang menerima notif
            $table->unsignedBigInteger('created_by')->nullable(); // User yang kirim notif
            $table->timestamp('read_at')->nullable(); // User yang melakukan aksi (upload)

            // 5. Timestamps (created_at, updated_at)
            $table->timestamps();

            // --- CONSTRAINTS (Relasi) ---
            
            // Relasi ke tabel SPK (On Delete Cascade: Jika SPK dihapus, notif hilang)
            $table->foreign('id_spk')
                  ->references('id')
                  ->on('spk')
                  ->onDelete('cascade');

            $table->foreign('id_section')
                  ->references('id')
                  ->on('section_trans')
                  ->onDelete('cascade');

            // Relasi ke tabel Document Transaksi (Opsional, sesuaikan nama tabel dokumen Anda)
            // Asumsi tabel dokumen bernama 'document_trans' sesuai konteks sebelumnya
            $table->foreign('id_dokumen')
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
        Schema::dropIfExists('notifikasis');
    }
};