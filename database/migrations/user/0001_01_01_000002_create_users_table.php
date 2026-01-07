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
        Schema::connection('tako-user')->create('users', function (Blueprint $table) {
            $table->id('id_user');

            $table->enum('role', ['internal', 'eksternal']);

            $table->string('role_internal')->nullable();
            $table->unsignedBigInteger('id_perusahaan')->nullable();
            $table->unsignedBigInteger('id_customer')->nullable();

            $table->string('name'); // Sesuai kolom 'Name'
            $table->string('nik')->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            
            $table->rememberToken();
            $table->timestamps(); // created_at, updated_at

            $table->foreign('id_perusahaan')->references('id_perusahaan')->on('perusahaan')->onDelete('set null');
            $table->foreign('id_customer')->references('id_customer')->on('customers')->onDelete('set null');
        });

        Schema::connection('tako-user')->create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::connection('tako-user')->create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->unsignedBigInteger('user_id')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-user')->dropIfExists('users');
        Schema::connection('tako-user')->dropIfExists('password_reset_tokens');
        Schema::connection('tako-user')->dropIfExists('sessions');
    }
};
