<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Role extends SpatieRole
{
    protected $connection = 'tako-user';

    // Definisikan ulang fillable
    protected $fillable = [
        'name',
        'guard_name',
        'change_upload_permission', // Kolom baru Anda
        'updated_at',
        'created_at'
    ];

    public function userUploadPermission(): BelongsTo
    {   
        return $this->belongsTo(User::class, 'change_upload_permission', 'id_user');
    }
}