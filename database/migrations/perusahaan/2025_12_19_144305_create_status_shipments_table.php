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
        Schema::create('status_shipments', function (Blueprint $table) {
            $table->id('id_dokumen');

            $table->unsignedBigInteger('id_spk')->nullable();

            $table->boolean('attribute')->default(0);
            $table->string('nama_file');
            $table->string('url_path_file')->nullable(); 

            $table->string('type_file')->nullable();
            $table->string('link_url_type_file')->nullable();
            $table->text('description_type_file')->nullable();

            $table->unsignedBigInteger('updated_by')->nullable(); 

            $table->json('logs')->nullable();

            $table->timestamps();

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
        Schema::dropIfExists('status_shipments');
    }
};
