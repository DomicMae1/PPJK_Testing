<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpkStatus extends Model
{
    use HasFactory;

    protected $table = 'spk_statuses';

    protected $fillable = [
        'id_spk',
        'id_status',
        'status',
        'priority',
    ];

    /**
     * Relasi ke SPK (Local Tenant DB)
     */
    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    /**
     * Relasi ke Master Status (Central DB 'tako-user')
     */
    public function masterStatus(): BelongsTo
    {
        return $this->belongsTo(MasterStatus::class, 'id_status', 'id_status');
    }
}