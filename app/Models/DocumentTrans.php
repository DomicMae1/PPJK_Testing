<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentTrans extends Model
{
    use HasFactory;

    // Nama Tabel
    protected $table = 'document_trans';

    protected $primaryKey = 'id';

    protected $fillable = [
        'id_dokumen',
        'id_spk',
        'id_section',
        'upload_by',
        'nama_file',
        'url_path_file',
        'verify',
        'correction_attachment',
        'correction_attachment_file',
        'correction_description',
        'kuota_revisi',
        'count_revisi', // NEW
        'mapping_insw',
        'sla_document',
        'is_internal',
    ];

    protected $casts = [
        'verify' => 'boolean', // Nullable boolean
        'correction_attachment' => 'boolean',
        'kuota_revisi' => 'integer',
        'count_revisi' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * History status dokumen (Pending, Verified, Rejected, Uploaded)
     */
    public function statuses(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(DocumentStatus::class, 'id_dokumen_trans');
    }

    /**
     * Relasi ke Master Document (Database Pusat)
     * Menggunakan koneksi 'tako-user'
     */
    public function masterDocument(): BelongsTo
    {
        return $this->belongsTo(MasterDocument::class, 'id_dokumen', 'id_dokumen');
    }

    /**
     * Relasi ke SPK (Tenant DB)
     */
    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    /**
     * Relasi ke Section (Tenant DB)
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(MasterSection::class, 'id_section', 'id_section');
    }

    public function sectionTrans(): BelongsTo
    {
        return $this->belongsTo(SectionTrans::class, 'id_section', 'id_section');
    }

    /**
     * Relasi ke User Updater (Master DB)
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by', 'id_user');
    }
}