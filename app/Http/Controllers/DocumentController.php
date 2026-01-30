<?php

namespace App\Http\Controllers;

use App\Models\MasterDocument;
use App\Models\MasterSection; // Asumsi ada model ini
use App\Models\MasterDocumentTrans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DocumentController extends Controller
{
    /**
     * Menampilkan daftar dokumen.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $documents = [];

        // --- 1. LOGIC MANAGER/SUPERVISOR (TENANT) ---
        if ($user->hasRole(['manager', 'supervisor'])) {
            $tenant = null;
            if ($user->id_perusahaan) {
                $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            }

            if ($tenant) {
                tenancy()->initialize($tenant);

                $documents = MasterDocumentTrans::with('section')
                    ->get()
                    ->map(function($item) {
                        return [
                            'id_dokumen' => $item->id_dokumen,
                            'id_section' => $item->id_section,
                            'nama_file' => $item->nama_file,
                            'description_file' => $item->description_file,
                            'is_internal' => $item->is_internal, // Boolean
                            'attribute' => $item->attribute,     // Boolean
                            
                            // --- FIELD BARU ---
                            'link_path_example_file' => $item->link_path_example_file ? Storage::url($item->link_path_example_file) : null,
                            'link_path_template_file' => $item->link_path_template_file ? Storage::url($item->link_path_template_file) : null,
                            'link_url_video_file' => $item->link_url_video_file,
                            
                            'section' => $item->section,
                            'source' => 'trans'
                        ];
                    });
            }

        // --- 2. LOGIC ADMIN (GLOBAL) ---
        } elseif ($user->hasRole('admin')) {
            $documents = MasterDocument::with('section')
                ->get()
                ->map(function($item) {
                    return [
                        'id_dokumen' => $item->id_dokumen,
                        'id_section' => $item->id_section,
                        'nama_file' => $item->nama_file,
                        'description_file' => $item->description_file,
                        'is_internal' => $item->is_internal, // Boolean
                        'attribute' => $item->attribute,     // Boolean
                        
                        // --- FIELD BARU ---
                        'link_path_example_file' => $item->link_path_example_file,
                        'link_path_template_file' => $item->link_path_template_file,
                        'link_url_video_file' => $item->link_url_video_file,
                        
                        'section' => $item->section,
                        'source' => 'master'
                    ];
                });
        }

        // Ambil data section untuk dropdown
        // Asumsi MasterSection ada di database 'tako-user' (Global)
        // Kita gunakan on('tako-user') untuk memastikan ambil dari global meskipun sedang di context tenant
        $sections = MasterSection::on('tako-user')->orderBy('section_order', 'asc')->get();

        return Inertia::render('m_document/page', [
            'documents' => $documents,
            'sections' => $sections,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Menyimpan dokumen baru.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // 1. Validasi Input
        $validated = $request->validate([
            'id_section' => 'required|numeric', 
            'nama_file' => 'required|string|max:255',
            'description_file' => 'nullable|string',
            'link_url_video_file' => 'nullable|url',
            
            // PERUBAHAN: Validasi String Path (Bukan File Upload lagi)
            // Karena file sudah diupload via dropzone ke folder temp
            'link_path_example_file' => 'nullable|string', 
            'link_path_template_file' => 'nullable|string',
            
            'is_internal' => 'boolean',
            'attribute' => 'boolean',
        ]);

        // Default value boolean
        $validated['is_internal'] = $request->boolean('is_internal', false);
        $validated['attribute'] = $request->boolean('attribute', false);

        // --- Logic Helper: Pindahkan File dari Temp ke Permanen ---
        $moveFileFromTemp = function ($tempPath, $targetFolder) {
            // Jika tidak ada path, kembalikan null
            if (!$tempPath) return null;

            // Pastikan menggunakan disk yang sama ('public' sesuai upload temp anda)
            $disk = Storage::disk('public'); 

            // Cek apakah file ada di temp (hindari error jika path salah/kosong)
            if ($disk->exists($tempPath)) {
                $filename = basename($tempPath);
                $newPath = $targetFolder . '/' . $filename;

                // Pastikan folder tujuan ada
                if (!$disk->exists($targetFolder)) {
                    $disk->makeDirectory($targetFolder);
                }

                // Pindahkan file
                $disk->move($tempPath, $newPath);
                
                return $newPath; // Return path baru untuk disimpan di DB
            }

            return null; // File tidak ditemukan di temp (mungkin sudah dipindah atau invalid)
        };

        // --- Eksekusi Pemindahan File ---
        
        // Pindahkan Contoh File
        if (!empty($validated['link_path_example_file'])) {
            $validated['link_path_example_file'] = $moveFileFromTemp(
                $validated['link_path_example_file'], 
                'documents/examples'
            );
        }

        // Pindahkan Template File
        if (!empty($validated['link_path_template_file'])) {
            $validated['link_path_template_file'] = $moveFileFromTemp(
                $validated['link_path_template_file'], 
                'documents/templates'
            );
        }

        $validated['updated_by'] = $user->id;

        // --- Logic Store Berdasarkan Role ---

        if ($user->hasRole('admin')) {
            // ADMIN -> Master Document (Global)
            $request->validate(['id_section' => 'exists:tako-user.master_sections,id_section']);
            MasterDocument::create($validated);

        } elseif ($user->hasRole(['manager', 'supervisor'])) {
            // MANAGER -> Master Document Trans (Tenant)
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            if (!$tenant) {
                return redirect()->back()->withErrors(['error' => 'Tenant tidak ditemukan.']);
            }
            tenancy()->initialize($tenant);

            MasterDocumentTrans::create($validated);

        } else {
            abort(403, 'Unauthorized action.');
        }

        return redirect()->back()->with('success', 'Dokumen berhasil ditambahkan.');
    }

    /**
     * Memperbarui dokumen.
     * Note: Parameter $id merujuk ke 'id_dokumen'
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'id_section' => 'required|numeric', 
            'nama_file' => 'required|string|max:255',
            'description_file' => 'nullable|string',
            'is_internal' => 'boolean',
            'attribute' => 'boolean',
            'link_url_video_file' => 'nullable|url',
            
            // Validasi string path temp (nullable)
            'link_path_example_file' => 'nullable|string',
            'link_path_template_file' => 'nullable|string',
        ]);

        $validated['is_internal'] = $request->boolean('is_internal', false);
        $validated['attribute'] = $request->boolean('attribute', false);

        $document = null;

        // --- 1. GET DOCUMENT & CHECK PERMISSION ---
        if ($user->hasRole('admin')) {
            $document = MasterDocument::findOrFail($id);
            $request->validate(['id_section' => 'exists:tako-user.master_sections,id_section']);
        } elseif ($user->hasRole(['manager', 'supervisor'])) {
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            if ($tenant) tenancy()->initialize($tenant);
            $document = MasterDocumentTrans::findOrFail($id);
        } else {
            abort(403, 'Unauthorized action.');
        }

        // --- 2. LOGIC MOVE FILE (Helper) ---
        $moveFileFromTemp = function ($tempPath, $targetFolder) {
            if (!$tempPath) return null;
            $disk = Storage::disk('public'); 
            if ($disk->exists($tempPath)) {
                $filename = basename($tempPath);
                $newPath = $targetFolder . '/' . $filename;
                if (!$disk->exists($targetFolder)) $disk->makeDirectory($targetFolder);
                $disk->move($tempPath, $newPath);
                return $newPath;
            }
            return null;
        };

        // --- 3. PROCESS UPDATE FILE ---
        
        // Update Example File
        if (!empty($validated['link_path_example_file'])) {
            // Hapus file lama jika ada
            if ($document->link_path_example_file && Storage::disk('public')->exists($document->link_path_example_file)) {
                Storage::disk('public')->delete($document->link_path_example_file);
            }
            // Pindahkan file baru
            $validated['link_path_example_file'] = $moveFileFromTemp($validated['link_path_example_file'], 'documents/examples');
        } else {
            // Jika tidak ada upload baru, hapus key dari validated agar tidak menimpa data lama dengan null/empty
            unset($validated['link_path_example_file']);
        }

        // Update Template File
        if (!empty($validated['link_path_template_file'])) {
            if ($document->link_path_template_file && Storage::disk('public')->exists($document->link_path_template_file)) {
                Storage::disk('public')->delete($document->link_path_template_file);
            }
            $validated['link_path_template_file'] = $moveFileFromTemp($validated['link_path_template_file'], 'documents/templates');
        } else {
            unset($validated['link_path_template_file']);
        }

        // --- 4. SAVE ---
        $validated['updated_by'] = $user->id;
        $document->update($validated);

        return redirect()->back()->with('success', 'Dokumen berhasil diperbarui.');
    }

    /**
     * Menghapus dokumen.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $document = null;

        // --- 1. Tentukan Model & Context Berdasarkan Role ---

        if ($user->hasRole('admin')) {
            // ADMIN: Hapus dari Master Document (Global/Central)
            // Tidak perlu inisialisasi tenancy karena ada di DB Central
            $document = MasterDocument::findOrFail($id);

        } elseif ($user->hasRole(['manager', 'supervisor'])) {
            // MANAGER: Hapus dari Master Document Trans (Tenant)
            
            // A. Cari Tenant berdasarkan user
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            
            if (!$tenant) {
                return redirect()->back()->withErrors(['error' => 'Tenant perusahaan tidak ditemukan.']);
            }

            // B. PENTING: Inisialisasi Tenancy
            // Ini akan mengubah koneksi DB ke DB Tenant dan root path Storage (jika dikonfigurasi)
            tenancy()->initialize($tenant);

            // C. Cari Dokumen di dalam scope Tenant
            $document = MasterDocumentTrans::findOrFail($id);
            
            // (Opsional) Validasi tambahan keamanan jika diperlukan
            // if ($document->created_by !== $user->id) { ... }

        } else {
            abort(403, 'Unauthorized action.');
        }

        // --- 2. Hapus File Fisik (Cleanup) ---
        // Gunakan disk 'public' sama seperti saat store
        $disk = Storage::disk('public');

        // Hapus Example File
        if ($document->link_path_example_file && $disk->exists($document->link_path_example_file)) {
            $disk->delete($document->link_path_example_file);
        }

        // Hapus Template File
        if ($document->link_path_template_file && $disk->exists($document->link_path_template_file)) {
            $disk->delete($document->link_path_template_file);
        }

        // --- 3. Hapus Record Database ---
        $document->delete();

        // Jika menggunakan tenancy, end tenancy (opsional, tergantung middleware Anda)
        // if (function_exists('tenancy') && tenancy()->initialized) {
        //     tenancy()->end(); 
        // }

        return redirect()->back()->with('success', 'Dokumen berhasil dihapus.');
    }

    public function upload(Request $request)
    {
        // 1. Validasi Input
        $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB (sesuaikan)
            'type' => 'required|string',         // 'template' atau 'example'
            'doc_name' => 'required|string',     // Nama dokumen (misal: "SOP Packaging")
        ]);

        $file = $request->file('file');
        
        // 2. Ambil Input Data
        // Bersihkan nama dokumen agar aman untuk nama file (ganti spasi dengan underscore, hapus karakter aneh)
        $rawDocName = $request->input('doc_name');
        $cleanDocName = preg_replace('/[^A-Za-z0-9_\-]/', '_', strtolower($rawDocName));
        
        // Tentukan suffix berdasarkan tipe (template/example)
        $type = strtolower($request->input('type')); // Hasil: 'template' atau 'example'
        
        $ext = $file->getClientOriginalExtension();
        $uniqueId = uniqid(); // Tetap pakai unique ID agar tidak bentrok jika upload file yg sama berkali-kali
        
        // Format Nama File: sop_packaging_template_65a12b.pdf
        $filename = "{$cleanDocName}_{$type}_{$uniqueId}.{$ext}";

        // 3. Konfigurasi Penyimpanan (Temp)
        // Gunakan disk 'public' agar mudah dipindahkan nanti, atau disk khusus temp Anda
        $disk = Storage::disk('public'); 
        $tempDir = 'documents/temp'; // Folder sementara

        // Buat folder temp jika belum ada
        if (!$disk->exists($tempDir)) {
            $disk->makeDirectory($tempDir);
        }

        // 4. Simpan File
        $tempPath = "{$tempDir}/{$filename}";
        
        // Simpan file
        $disk->put($tempPath, file_get_contents($file->getRealPath()));

        // 5. Return Response JSON
        return response()->json([
            'status'    => 'success',
            'path'      => $tempPath,  // Path ini yang akan dikirim kembali oleh Frontend saat tombol "Simpan" ditekan
            'nama_file' => $filename,
            'is_temp'   => true,
        ]);
    }
}