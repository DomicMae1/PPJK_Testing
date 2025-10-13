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
            $table->id('id_link'); 

            $table->unsignedBigInteger('id_perusahaan');
            $table->foreign('id_perusahaan')->references('id')->on('perusahaan')->onDelete('cascade');
            $table->unsignedBigInteger('id_user');
            $table->foreign('id_user')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->unsignedBigInteger('id_customer')->nullable();

            $table->string('token')->unique();
            $table->string('url')->nullable();
            $table->string('nama_customer'); 

            $table->boolean('is_filled')->default(false); 
            $table->timestamp('filled_at')->nullable();  

            $table->timestamps(); 
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
