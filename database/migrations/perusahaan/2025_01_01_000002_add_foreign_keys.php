<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::connection('tako-perusahaan')->table('users', function (Blueprint $table) {
            $table->foreign('id_perusahaan')
                ->references('id_Perusahaan')
                ->on('perusahaan')
                ->onDelete('set null');
        });

        Schema::connection('tako-perusahaan')->table('sessions', function (Blueprint $table) {
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });

        Schema::connection('tako-perusahaan')->table('perusahaan', function (Blueprint $table) {
            $table->foreign('id_User_1')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->foreign('id_User_2')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->foreign('id_User_3')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::connection('tako-perusahaan')->table('users', function (Blueprint $table) {
            $table->dropForeign(['id_perusahaan']);
        });

        Schema::connection('tako-perusahaan')->table('sessions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::connection('tako-perusahaan')->table('perusahaan', function (Blueprint $table) {
            $table->dropForeign(['id_User_1']);
            $table->dropForeign(['id_User_2']);
            $table->dropForeign(['id_User_3']);
        });
    }
};
