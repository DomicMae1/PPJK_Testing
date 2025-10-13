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
        Schema::connection('tako-perusahaan')->create('perusahaan_user_roles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perusahaan');
            $table->unsignedBigInteger('user_id');
            $table->string('role');

            $table->foreign('id_perusahaan')->references('id')->on('perusahaan')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('perusahaan_user_roles');
    }
};
