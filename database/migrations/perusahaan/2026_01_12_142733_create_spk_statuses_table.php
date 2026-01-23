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
        Schema::create('spk_statuses', function (Blueprint $table) {
            $table->id();
            
            $table->unsignedBigInteger('id_spk');
            
            $table->unsignedBigInteger('id_status'); 
            
            $table->string('status');

            $table->integer('priority');
            
            $table->timestamps();

            $table->foreign('id_spk')
                  ->references('id')
                  ->on('spk') 
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spk_statuses');
    }
};