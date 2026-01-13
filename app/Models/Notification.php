<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    // Nama Tabel
    protected $table = 'notification';

    // Primary Key Custom
    protected $primaryKey = 'id_notification';

    // Kolom yang boleh diisi (Mass Assignment)
    protected $fillable = [
        'id_spk',
        'id_section',
        'id_dokumen',
        'status',
        'data',
        'user_id',
        'role',
        'uploaded_by',
        'created_by',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Relasi ke SPK
     */
    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    /**
     * Relasi ke Section Trans
     */
    public function sectionTrans(): BelongsTo
    {
        return $this->belongsTo(SectionTrans::class, 'id_section', 'id_section');
    }

    /**
     * Relasi ke Document Transaction
     */
    public function document(): BelongsTo
    {
        // Sesuaikan nama model DocumentTrans Anda
        return $this->belongsTo(DocumentTrans::class, 'id_dokumen', 'id');
    }

    /**
     * Relasi ke User (Yang mengupload/trigger aksi)
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by', 'id');
    }

    /**
     * Relasi ke User (Yang membuat record notif)
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    public function isInternal(): bool
    {
        return $this->Role === 'internal';
    }

    public function isExternal(): bool
    {
        return $this->Role === 'eksternal';
    }
}