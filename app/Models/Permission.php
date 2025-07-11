<?php

namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    // Override koneksi ke database 'tako-perusahaan'
    protected $connection = 'tako-perusahaan';
}
