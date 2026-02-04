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
        Schema::connection('tako-user')->create('customers', function (Blueprint $table) {
            $table->id('id_customer');

            // UID (Unique Identifier) - Baru
            $table->uuid('uid')->nullable();

            // Data Utama
            $table->string('nama_perusahaan')->nullable();
            $table->enum('type', ['internal', 'external']);

            // Data Personal / Kontak
            $table->string('nama')->nullable();
            $table->string('email')->nullable();

            $table->unsignedBigInteger('ownership')->nullable();
            $table->unsignedBigInteger('created_by')->nullable()->after('ownership');

            $table->string('no_npwp', 50)->nullable();
            $table->string('no_npwp_16', 50)->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-user')->dropIfExists('customers');
    }
};
