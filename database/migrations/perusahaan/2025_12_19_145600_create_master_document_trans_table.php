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
        Schema::create('master_documents_trans', function (Blueprint $table) {
            // 1. Primary Key (sesuai request: id_dokumen)
            $table->id('id_dokumen');
            $table->unsignedBigInteger('id_section')->nullable();
            $table->string('nama_file');
            $table->boolean('is_internal')->default(false)->after('nama_file');

            // 3. Data File & Atribut
            $table->boolean('attribute')->default(0); // 1 = mandatory, 0 = optional

            // 4. Link Pendukung (Pindahan dari master_documents)
            $table->string('link_path_example_file')->nullable();
            $table->string('link_path_template_file')->nullable(); // Saya perbaiki typo spasi di request anda
            $table->string('link_url_video_file')->nullable();
            
            $table->text('description_file')->nullable();

            // 5. Tracking
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps(); // created_at, updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-user')->dropIfExists('master_documents_trans');
    }
};
