<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StatusShipment extends Model
{
    use HasFactory;

    // protected $connection = 'tako-user';
    protected $table = 'status_shipments';

    // PENTING: Definisi Primary Key baru
    protected $primaryKey = 'id_dokumen';

    protected $fillable = [
        'id_spk',
        'attribute',             // 1 = Mandatory, 0 = Non-mandatory
        'nama_file',
        'url_path_file',
        'type_file',
        'link_url_type_file',
        'description_type_file',
        'updated_by',
        'logs',
    ];

    /**
     * Casts attributes to specific types.
     */
    protected $casts = [
        'logs' => 'array',       // JSON ke Array
        'attribute' => 'boolean', // 1/0 ke True/False
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Relasi ke SPK.
     * Setiap status shipment milik satu SPK (atau null).
     */
    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    /**
     * Relasi ke User yang terakhir update.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by', 'id_user');
    }

    /**
     * Helper untuk cek mandatory
     */
    public function isMandatory(): bool
    {
        return $this->attribute === true;
    }
}
