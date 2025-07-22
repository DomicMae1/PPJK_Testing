<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Perusahaan extends Model
{
    protected $connection = 'tako-perusahaan';

    protected $table = 'perusahaan';
    protected $primaryKey = 'id_Perusahaan';

    protected $fillable = [
        'nama_perusahaan',
        'id_User_1',
        'id_User_2',
        'id_User_3',
        'id_User',
        'Notify_1',
        'Notify_2',
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
}
