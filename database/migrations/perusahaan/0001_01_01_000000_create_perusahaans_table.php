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
        Schema::connection('tako-perusahaan')->create('perusahaan', function (Blueprint $table) {
            $table->id('id_Perusahaan');
            $table->string('nama_perusahaan');

            $table->unsignedBigInteger('id_User_1')->nullable();
            $table->unsignedBigInteger('id_User_2')->nullable();
            $table->unsignedBigInteger('id_User_3')->nullable();

            $table->string('notify_1')->nullable();
            $table->string('notify_2')->nullable();

            $table->timestamps();

            // // Foreign key ke tabel users
            // $table->foreign('id_User_1')
            //     ->references('id')
            //     ->on('users')
            //     ->onDelete('set null');

            // $table->foreign('id_User_2')
            //     ->references('id')
            //     ->on('users')
            //     ->onDelete('set null');

            // $table->foreign('id_User_3')
            //     ->references('id')
            //     ->on('users')
            //     ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::connection('tako-perusahaan')->dropIfExists('perusahaan');
    }
};
