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
        // Pastikan menggunakan connection('tako-user')
        Schema::connection('tako-user')->table('roles', function (Blueprint $table) {
            $table->unsignedBigInteger('change_upload_permission')->nullable()->after('guard_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-user')->table('roles', function (Blueprint $table) {
            $table->dropColumn('change_upload_permission');
        });
    }
};