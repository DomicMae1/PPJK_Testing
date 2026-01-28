<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Spk extends Model
{
    use HasFactory;

    // protected $connection = 'tako-user';
    protected $table = 'spk';

    protected $fillable = [
        'id_perusahaan', // ID Perusahaan (Internal)
        'id_customer',       // ID Customer (External)
        'spk_code',          // Keterangan / BL Number / SI Number
        'shipment_type',     // Import / Export
        'created_by',        // ID User pembuat
        'validated_by',      // ID User validator
        'penjaluran',
        'internal_can_upload',       // Boolean
    ];

    protected $appends = ['is_created_by_internal'];

    /**
     * Casts attributes to specific types.
     * log otomatis diubah jadi array saat diakses, dan json saat disimpan.
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relasi ke Perusahaan (Internal) yang menangani SPK ini.
     */
    public function perusahaan(): BelongsTo
    {
        return $this->belongsTo(Perusahaan::class, 'id_perusahaan', 'id_perusahaan');
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

    public function getIsCreatedByInternalAttribute(): bool
    {
        // Pastikan relasi creator ada datanya
        if ($this->creator) {
            // Memanggil fungsi isInternal() dari model User
            return $this->creator->isInternal(); 
        }
        
        return false;
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
    public function hsCodes(): HasMany
    {
        // Parameter: Model Tujuan, Foreign Key di tabel tujuan, Local Key di tabel ini
        return $this->hasMany(HsCode::class, 'id_spk', 'id');
    }

    public function statuses(): HasMany
    {
        return $this->hasMany(SpkStatus::class, 'id_spk', 'id');
    }

    /**
     * Relasi ke STATUS TERAKHIR (Current Status)
     * Menggunakan latestOfMany() agar efisien saat dipanggil di list/table
     */
    public function latestStatus()
    {
        return $this->hasOne(SpkStatus::class, 'id_spk', 'id')->latestOfMany();
    }

    public function sections()
    {
        // Relasi SPK ke Section Transaksi
        return $this->hasMany(SectionTrans::class, 'id_spk', 'id');
    }
}
