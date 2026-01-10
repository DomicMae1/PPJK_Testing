<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MasterDocument extends Model
{
    use HasFactory;

    // 1. Koneksi Database
    protected $connection = 'tako-user';

    // 2. Nama Tabel
    protected $table = 'master_documents';

    // 3. Primary Key
    protected $primaryKey = 'id_dokumen';

    // 4. Fillable (Mass Assignment)
    protected $fillable = [
        'id_section',
        'nama_file',
        'attribute',
        'link_path_example_file',
        'link_path_template_file',
        'link_url_video_file',
        'description_file',
        'updated_by',
        // created_at dan updated_at otomatis dihandle
    ];

    // 5. Casting Tipe Data
    protected $casts = [
        'attribute' => 'boolean',
        'deadline_document' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function section(): BelongsTo
    {
        // Asumsi Model Section bernama MasterSection dan PK-nya id_section
        return $this->belongsTo(MasterSection::class, 'id_section', 'id_section');
    }
    
    /**
     * Relasi ke User (Updated By) - Opsional jika menggunakan tabel users internal
     */
    public function updater()
    {
        // Sesuaikan nama model User dan Foreign Key di tabel users
        return $this->belongsTo(User::class, 'updated_by', 'id'); 
    }
}