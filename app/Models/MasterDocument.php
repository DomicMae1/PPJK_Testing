<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MasterDocument extends Model
{
    use HasFactory;

    // protected $connection = 'tako-user';
    protected $table = 'master_documents';

    // PENTING: Definisi Primary Key baru
    protected $primaryKey = 'id_dokumen';

    protected $fillable = [
        'id_spk',
        'id_section',
        'attribute',            // Mandatory check
        'upload_by',            // Role string: internal/external
        'nama_file',
        'url_path_file',
        'description_file',
        'verify',               // Status Approval
        'correction_attachment',
        'correction_attachment_file',
        'correction_description',
        'kuota_revisi',
        'mapping_insw',
        'updated_by',
        'logs',
    ];

    /**
     * Casts attributes to specific types.
     */
    protected $casts = [
        'attribute' => 'boolean',
        'verify' => 'boolean',
        'correction_attachment' => 'boolean',
        'logs' => 'array',
        'kuota_revisi' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Relasi ke SPK Induk.
     */
    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    /**
     * Relasi ke Section (Kategori Dokumen).
     * Contoh: PPJK, PIB, dll.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(MasterSection::class, 'id_section', 'id_section');
    }

    /**
     * Relasi ke User yang melakukan update terakhir.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by', 'id_user');
    }

    /*
    |--------------------------------------------------------------------------
    | Helper Functions
    |--------------------------------------------------------------------------
    */

    /**
     * Cek apakah dokumen ini sudah diverifikasi (valid).
     */
    public function isValid(): bool
    {
        return $this->verify === true;
    }

    /**
     * Cek apakah dokumen ini perlu revisi.
     */
    public function needsCorrection(): bool
    {
        // Logika: Belum valid, ada lampiran koreksi atau ada deskripsi koreksi
        return !$this->verify && ($this->correction_attachment || !empty($this->correction_description));
    }
}
