<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HsCode extends Model
{
    use HasFactory;

    // protected $connection = 'tako-user';
    protected $table = 'hs_codes';

    // PENTING: Definisi Primary Key baru
    protected $primaryKey = 'id_hscode';

    protected $fillable = [
        'id_spk',
        'hs_code',
        'link_insw',
        'path_link_insw',
        'updated_by',
        'logs',
    ];

    /**
     * Casting log ke array otomatis agar mudah dikelola di controller
     */
    protected $casts = [
        'logs' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Relasi ke User yang terakhir mengupdate.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by', 'id_user');
    }

    /**
     * Relasi ke SPK.
     * Satu HS Code bisa dipakai di banyak SPK.
     */
    public function spk(): BelongsTo
    {
        // Parameter: Model Tujuan, Foreign Key di tabel ini, Owner Key di tabel tujuan
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }
}
