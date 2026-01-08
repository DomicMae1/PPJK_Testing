<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    protected $connection = 'tako-user';

    protected $primaryKey = 'id_user';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'role',
        'id_perusahaan',
        'id_customer',
        'name',
        'nik',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    
    public function role_internal(): BelongsToMany
    {
        // Parameter: Model Tujuan, Nama Table Pivot, FK Model Ini, FK Model Tujuan
        return $this->belongsToMany(Perusahaan::class, 'perusahaan_user_roles', 'id_user', 'id_perusahaan')
            ->withPivot('role') // Agar bisa akses $user->role_internal[0]->pivot->role
            ->withTimestamps();
    }

    public function perusahaan(): BelongsTo
    {
        return $this->belongsTo(Perusahaan::class, 'id_perusahaan', 'id_perusahaan');
    }

    public function companies(): BelongsTo
    {
        // Kita arahkan ke fungsi perusahaan yang sudah ada, atau tulis ulang return-nya
        return $this->belongsTo(Perusahaan::class, 'id_perusahaan', 'id_perusahaan');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'id_customer', 'id_customer');
    }

    public function isInternal(): bool
    {
        return $this->Role === 'internal';
    }

    public function isExternal(): bool
    {
        return $this->Role === 'eksternal';
    }
}
