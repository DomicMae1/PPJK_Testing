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
        Schema::connection('tako-user')->create('customers', function (Blueprint $table) {
            $table->id('id_customer');

            $table->string('nama_perusahaan');
            $table->enum('type', ['internal', 'external']);

            $table->string('nama');
            $table->string('email');

            $table->unsignedBigInteger('ownership')->nullable();
            $table->unsignedBigInteger('created_by')->nullable()->after('ownership');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-user')->dropIfExists('customers');
    }
};
