<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerLink extends Model
{
    protected $connection = 'tako-perusahaan'; // pakai koneksi perusahaan
    protected $table = 'customer_links';
    protected $primaryKey = 'id_link';

    protected $fillable = [
        'id_user',
        'link_customer',
        'nama_customer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }
}
