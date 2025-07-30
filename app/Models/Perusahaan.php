<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Perusahaan extends Model
{
    protected $connection = 'tako-perusahaan';

    protected $table = 'perusahaan';

    protected $fillable = [
        'nama_perusahaan',
        // 'id_User_1',
        // 'id_User_2',
        // 'id_User_3',
        // 'id_User',
        'notify_1',
        'notify_2',
    ];

    public function user1()
    {
        return $this->belongsTo(User::class, 'id_User_1');
    }
    public function user2()
    {
        return $this->belongsTo(User::class, 'id_User_2');
    }
    public function user3()
    {
        return $this->belongsTo(User::class, 'id_User_3');
    }
    // Relasi ke user utama
    public function user()
    {
        return $this->belongsTo(User::class, 'id_User');
    }

    // Relasi user fleksibel (baru) lewat pivot
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'perusahaan_user_roles', 'id_perusahaan', 'user_id')
            ->withPivot('role')
            ->withTimestamps();
    }
}
