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
        Schema::create('hs_codes', function (Blueprint $table) {
            $table->id('id_hscode');

            $table->string('hs_code'); 
            $table->string('link_insw')->nullable();
            $table->string('path_link_insw')->nullable();

            $table->unsignedBigInteger('updated_by')->nullable();

            $table->json('logs')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hs_codes');
    }
};
