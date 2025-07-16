<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Customer;

class CustomerLink extends Model
{
    protected $connection = 'tako-perusahaan'; // koneksi yang digunakan
    protected $table = 'customer_links';
    protected $primaryKey = 'id_link'; // sesuai dengan migration

    protected $fillable = [
        'id_user',
        'id_customer',       // ✅ kolom relasi ke tabel customers
        'token',             // ✅ token acak, unik
        'nama_customer',     // ✅ input dari marketing
        'is_filled',         // ✅ boolean apakah sudah diisi
        'filled_at',         // ✅ waktu saat diisi
    ];

    protected $casts = [
        'is_filled' => 'boolean',
        'filled_at' => 'datetime',
    ];

    /**
     * Relasi ke user pembuat link
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    /**
     * Relasi ke customer (jika sudah terhubung)
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class, 'id_customer');
    }
}
