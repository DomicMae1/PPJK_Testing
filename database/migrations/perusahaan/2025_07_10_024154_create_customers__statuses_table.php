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
        Schema::connection('tako-perusahaan')->create('customers_statuses', function (Blueprint $table) {
            $table->id('id_Customer'); // Primary Key (bisa disesuaikan jika seharusnya FK ke customers)

            // FK ke users table (yang membuat)
            $table->foreignId('id_user')->constrained('users')->onDelete('cascade');

            // === Status 1 (Marketing Submit)
            $table->timestamp('submit_1_timestamps')->nullable(); // Timestamp saat marketing submit

            // === Status 1 (Manager)
            $table->foreignId('status_1_by')->nullable()->constrained('users')->onDelete('set null'); // User yang approve status 1
            $table->timestamp('status_1_timestamps')->nullable(); // Timestamp saat status 1 disetujui
            $table->text('status_1_keterangan')->nullable(); // Keterangan dari status 1
            $table->string('status_1_attach')->nullable(); // File lampiran status 1

            // === Status 2 (Direktur)
            $table->foreignId('status_2_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('status_2_timestamps')->nullable();
            $table->text('status_2_keterangan')->nullable();
            $table->string('status_2_attach')->nullable();

            // === Status 3 (Lawyer)
            $table->foreignId('status_3_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('status_3_timestamps')->nullable();
            $table->text('status_3_keterangan')->nullable();
            $table->text('status_3')->nullable();
            $table->string('submit_3_attach')->nullable(); // catatan: ini *submit_3_attach* bukan status_3_attach

            $table->timestamps(); // created_at & updated_at
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-perusahaan')->dropIfExists('customers_statuses');
    }
};
