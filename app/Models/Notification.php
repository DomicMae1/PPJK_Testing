<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;
    
    // Connection managed by stancl/tenancy - no hardcoded connection needed
    protected $table = 'notification'; // FIX: Database uses 'notification' (singular)
    protected $primaryKey = 'id_notification'; // FIX: Table uses id_notification, not id

    protected $fillable = [
        'send_to',       // RENAMED from user_id - who receives notification
        'created_by',    // NEW: who triggered the notification
        'role',
        'id_section',
        'id_spk',
        // 'id_dokumen' - REMOVED: unified document tracking via data.documents[]
        'data',          // Contains: type, title, message, url, documents[], summary, etc.
        'read_at',
    ];
    // type, title, message removed - now in data JSON

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Attributes to append to model's array/JSON form
     */
    protected $appends = ['id'];

    /**
     * Get the ID attribute (maps from id_notification for frontend compatibility)
     */
    public function getIdAttribute()
    {
        return $this->attributes['id_notification'] ?? null;
    }

    /**
     * Override toArray to include 'id' for frontend compatibility
     */
    public function toArray()
    {
        $array = parent::toArray();
        $array['id'] = $this->id_notification; // Explicitly add 'id' for frontend
        return $array;
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    public function section(): BelongsTo
    {
        // Sesuaikan 'SectionTrans::class' dengan nama Model Section Anda yang sebenarnya
        // Asumsi PK di tabel section adalah 'id'
        return $this->belongsTo(SectionTrans::class, 'id_section', 'id');
    }

    /**
     * User who receives this notification
     */
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'send_to', 'id_user');
    }

    /**
     * User who created/triggered this notification
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id_user');
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope untuk filter notifikasi yang belum dibaca
     */
    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    /**
     * Scope untuk filter notifikasi untuk user tertentu (penerima)
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('send_to', $userId);
    }

    /**
     * Scope untuk filter notifikasi by creator
     */
    public function scopeCreatedBy($query, $userId)
    {
        return $query->where('created_by', $userId);
    }




    /*
    |--------------------------------------------------------------------------
    | Helper Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Mark notification as read
     */
    public function markAsRead()
    {
        $this->update(['read_at' => now()]);
    }

    /**
     * Check if notification is read
     */
    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    /**
     * Check if notification is unread
     */
    public function isUnread(): bool
    {
        return $this->read_at === null;
    }
}
