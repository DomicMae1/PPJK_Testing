<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MasterStatus extends Model
{
    use HasFactory;
    
    protected $connection = 'tako-user';

    protected $table = 'master_statuses';

    protected $primaryKey = 'id_status';

    protected $fillable = [
        'index',    // Nama/Kode Status
        'priority', // Urutan Prioritas
    ];
    
    protected $casts = [
        'index' => 'integer',
    ];
}