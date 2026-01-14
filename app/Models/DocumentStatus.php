<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentStatus extends Model
{
    use HasFactory;

    protected $table = 'document_statuses';

    protected $fillable = [
        'id_dokumen_trans',
        'status',
        'by', // User ID
    ];

    /**
     * Relasi ke Document Transaction
     */
    public function documentTrans(): BelongsTo
    {
        return $this->belongsTo(DocumentTrans::class, 'id_dokumen_trans', 'id');
    }

    /**
     * Relasi ke User (Pembuat Status)
     * Menggunakan koneksi default/tenant atau master tergantung setup User Anda.
     * Jika User ada di DB Master, relasi ini mungkin perlu penyesuaian koneksi/model.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'by', 'id');
    }
}