<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Perusahaan extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';
    protected $table = 'perusahaan';

    protected $primaryKey = 'id_perusahaan';

    protected $fillable = [
        'nama_perusahaan',
        'logo_perusahaan',
        'notify_1',
        'notify_2',
        'sla',
        'sla_timer'
    ];

    protected $casts = [
        'sla' => 'boolean',
        'sla_timer' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'perusahaan_user_roles', 'id_perusahaan', 'id_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'ownership', 'id_perusahaan');
    }
    public function spk(): HasMany
    {
        // Asumsi model SPK nanti bernama 'Spk'
        return $this->hasMany(Spk::class, 'id_perusahaan', 'id_perusahaan');
    }

    public function staff()
    {
        return $this->users()->wherePivot('role', 'staff');
    }

    public function managers()
    {
        return $this->users()->wherePivot('role', 'manager');
    }

    public function supervisors()
    {
        return $this->users()->wherePivot('role', 'supervisor');
    }

    public function tenant()
    {
        return $this->hasOne(Tenant::class, 'perusahaan_id', 'id_perusahaan');
    }
}
