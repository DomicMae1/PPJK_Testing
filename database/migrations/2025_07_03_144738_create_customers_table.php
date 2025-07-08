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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('kategori_usaha');
            $table->string('nama_perusahaan');
            $table->string('bentuk_badan_usaha');
            $table->mediumText('alamat_lengkap');
            $table->string('kota');
            $table->integer('no_telp')->nullable();
            $table->integer('no_fax')->nullable();
            $table->mediumText('alamat_penagihan');
            $table->string('email');
            $table->string('website')->nullable();
            $table->string('top');
            $table->string('status_perpajakan');
            $table->string('no_npwp')->nullable();
            $table->string('no_npwp_16')->nullable();
            //data penanggung jawab / direktur
            $table->string('nama_pj');
            $table->string('no_ktp_pj');
            $table->string('no_telp_pj');
            // personal yg dihubungi
            $table->string('nama_personal');
            $table->string('jabatan_personal');
            $table->string('no_telp_personal');
            // approval
            $table->enum('status_approval', ['pending', 'approved', 'rejected'])->default('pending');
            // $table->string('keterangan_reject')->nullable(); // keterangan jika status approval adalah rejected
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // user yang membuat customer
            $table->foreignId('approved_1_by')->nullable()->constrained('users')->onDelete('set null'); // user yang menyetujui customer
            $table->foreignId('approved_2_by')->nullable()->constrained('users')->onDelete('set null'); // user yang menyetujui customer
            $table->foreignId('rejected_1_by')->nullable()->constrained('users')->onDelete('set null'); // user yang menolak customer
            $table->foreignId('rejected_2_by')->nullable()->constrained('users')->onDelete('set null'); // user yang menolak customer
            // $table->text('keterangan')->nullable(); // keterangan jika lawyer memiliki catatan khusus
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
