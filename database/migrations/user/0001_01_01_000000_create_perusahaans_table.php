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
        Schema::connection('tako-user')->create('perusahaan', function (Blueprint $table) {
            $table->id('id_perusahaan');
            $table->string('nama_perusahaan');
            $table->string('notify_1')->nullable();
            $table->string('notify_2')->nullable();
            $table->unsignedInteger('id_domain')->nullable()->after('nama_perusahaan');

            // $table->string('Server_DB')->nullable();
            // $table->string('Username_DB')->nullable();
            // $table->string('Password_DB')->nullable();
            // $table->string('DB_Name')->nullable();

            $table->boolean('sla')->default(false); 

            $table->integer('sla_timer')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('tako-user')->dropIfExists('perusahaan');
    }
};
