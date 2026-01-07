<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Spk extends Model
{
    use HasFactory;

    // protected $connection = 'tako-user';
    protected $table = 'spk';

    protected $fillable = [
        'id_perusahaan_int', // ID Perusahaan (Internal)
        'id_customer',       // ID Customer (External)
        'id_hscode',         // Relasi ke tabel hs_codes
        'spk_code',          // Keterangan / BL Number / SI Number
        'shipment_type',     // Import / Export
        'created_by',        // ID User pembuat
        'validated_by',      // ID User validator
        'log',               // JSON Logs
    ];

    /**
     * Casts attributes to specific types.
     * log otomatis diubah jadi array saat diakses, dan json saat disimpan.
     */
    protected $casts = [
        'log' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relasi ke Perusahaan (Internal) yang menangani SPK ini.
     */
    public function perusahaan(): BelongsTo
    {
        return $this->belongsTo(Perusahaan::class, 'id_perusahaan_int', 'id_perusahaan_int');
    }

    /**
     * Relasi ke Customer (Eksternal) pemilik SPK.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'id_customer', 'id_customer');
    }

    /**
     * Relasi ke User pembuat (Eksternal).
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id_user');
    }

    /**
     * Relasi ke User validator (Internal).
     */
    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by', 'id_user');
    }

    /**
     * Relasi ke HS Code.
     */
    public function hsCodeData(): BelongsTo
    {
        // Asumsi nama model nanti adalah HsCode
        return $this->belongsTo(HsCode::class, 'id_hscode', 'id_hscode');
    }
}
