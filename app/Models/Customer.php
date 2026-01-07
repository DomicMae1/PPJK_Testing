<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Models\Perusahaan;
use App\Models\CustomerAttach;

class Customer extends Model
{
    use SoftDeletes;

    protected $connection = 'tako-user';
    protected $table = 'customers';
    protected $primaryKey = 'id_customer';

    protected $fillable = [
        'nama_perusahaan',
        'type',
        'ownership',
        'email',
        'nama',
        'created_by',
    ];

    /**
     * Relasi ke perusahaan (dari database tako-perusahaan).
     */
    public function perusahaan()
    {
        return $this->belongsTo(Perusahaan::class, 'ownership', 'id_perusahaan');
    }

    public function creator()
    {
        // Parameter 2: Foreign Key di table customers (created_by)
        // Parameter 3: Primary Key di table users (id_user)
        return $this->belongsTo(User::class, 'created_by', 'id_user');
    }

    /**
     * Relasi ke lampiran dokumen customer.
     */
    public function users()
    {
        return $this->hasMany(User::class, 'id_customer', 'id_customer');
    }
}
