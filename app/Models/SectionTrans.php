<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SectionTrans extends Model
{
    use HasFactory;

    // protected $connection = 'tako-user';
    protected $table = 'section_trans';

    // PENTING: Definisi Primary Key baru
    protected $primaryKey = 'id';

    protected $fillable = [
        'id_section',
        'id_spk',
        'section_name',
        'section_order',
        'deadline',
        'sla',
    ];

    protected $casts = [
        'deadline' => 'boolean', // Convert 1/0 ke True/False otomatis
        'section_order' => 'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function masterSection(): BelongsTo
    {
        // Cross-database relation via Eloquent
        return $this->belongsTo(MasterSection::class, 'id_section', 'id_section');
    }

    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    /**
     * Relasi ke Master Document.
     * Satu section bisa punya banyak dokumen (list dokumen di dalamnya).
     */
    public function documents(): HasMany
    {
        // Model MasterDocument akan kita buat setelah ini
        return $this->hasMany(DocumentTrans::class, 'id_section', 'id_section');
    }
}
