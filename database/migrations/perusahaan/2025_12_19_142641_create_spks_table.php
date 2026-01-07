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
        // Pastikan connection sesuai (saya asumsikan masuk ke database operasional perusahaan)
        Schema::create('spk', function (Blueprint $table) {
            $table->id(); 
            $table->unsignedBigInteger('id_perusahaan_int')->nullable(); // Internal
            $table->unsignedBigInteger('id_customer')->nullable();       // External

            $table->unsignedBigInteger('id_hscode')->nullable();
            $table->string('spk_code')->nullable(); // Keterangan HS Code
            $table->string('shipment_type')->nullable(); // Import/Export

            $table->unsignedBigInteger('created_by')->nullable();   // User Eksternal
            $table->unsignedBigInteger('validated_by')->nullable(); // User Internal

            $table->json('log')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spk');
    }
};
