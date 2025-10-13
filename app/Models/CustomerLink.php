<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Customer;

class CustomerLink extends Model
{
    protected $connection = 'tako-perusahaan'; 
    protected $table = 'customer_links';
    protected $primaryKey = 'id_link'; 

    protected $fillable = [
        'id_user',
        'id_perusahaan',
        'id_customer',     
        'token',            
        'url',       
        'nama_customer',    
        'is_filled',       
        'filled_at', 
    ];

    protected $casts = [
        'is_filled' => 'boolean',
        'filled_at' => 'datetime',
    ];

    /**
     * Relasi ke user pembuat link
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function perusahaan()
    {
        return $this->belongsTo(Perusahaan::class, 'id_perusahaan');
    }

    /**
     * Relasi ke customer (jika sudah terhubung)
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class, 'id_customer');
    }
}
