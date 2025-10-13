<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customers_Status extends Model
{
    protected $connection = 'tako-perusahaan';

    protected $table = 'customers_statuses'; 

    protected $primaryKey = 'id_Customer';     

    public $incrementing = true;              

    protected $keyType = 'int';             

    protected $fillable = [
        'id_user',
        'submit_1_timestamps',
        'submit_1_nama_file',
        'submit_1_path',

        'status_1_by',
        'status_1_timestamps',
        'status_1_keterangan',
        'status_1_nama_file',
        'status_1_path',

        'status_2_by',
        'status_2_timestamps',
        'status_2_keterangan',
        'status_2_nama_file',
        'status_2_path',

        'status_3_by',
        'status_3_timestamps',
        'status_3_keterangan',
        'status_3',
        'submit_3_nama_file',
        'submit_3_path',
    ];

    protected $dates = [
        'status_1_timestamps',
        'submit_1_timestamps',
        'status_2_timestamps',
        'submit_2_timestamps',
        'status_3_timestamps',
        'submit_3_timestamps',
        'created_at',
        'updated_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'id_Customer');
    }

    public function submit1By()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function status1Approver()
    {
        return $this->belongsTo(User::class, 'status_1_by');
    }

    public function status2Approver()
    {
        return $this->belongsTo(User::class, 'status_2_by');
    }

    public function status3Approver()
    {
        return $this->belongsTo(User::class, 'status_3_by');
    }
}
