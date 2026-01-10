<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterSection extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';

    // protected $connection = 'tako-user';
    protected $table = 'master_sections';

    // PENTING: Definisi Primary Key baru
    protected $primaryKey = 'id_section';

    protected $fillable = [
        'section_name',
        'section_order',
    ];

    protected $casts = [
        'section_order' => 'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Relasi ke Master Document.
     * Satu section bisa punya banyak dokumen (list dokumen di dalamnya).
     */
    public function masterDocuments(): HasMany
    {
        return $this->hasMany(MasterDocument::class, 'id_section', 'id_section');
    }
}
