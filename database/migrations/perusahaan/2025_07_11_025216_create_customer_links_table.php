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
        Schema::connection('tako-perusahaan')->create('customer_links', function (Blueprint $table) {
            $table->id('id_link'); // Primary key

            // FK ke tabel users (marketing/user yang buat link)
            $table->unsignedBigInteger('id_user');
            $table->foreign('id_user')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            // FK ke tabel customers, nullable karena belum tentu diisi langsung
            $table->unsignedBigInteger('id_customer')->nullable();

            $table->string('token')->unique(); // token acak (hash, unik)
            $table->string('url')->nullable(); // token acak (hash, unik)
            $table->string('nama_customer');   // nama input dari marketing

            $table->boolean('is_filled')->default(false);  // status apakah sudah diisi
            $table->timestamp('filled_at')->nullable();    // waktu ketika diisi

            $table->timestamps(); // created_at & updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-perusahaan')->dropIfExists('customer_links');
    }
};
