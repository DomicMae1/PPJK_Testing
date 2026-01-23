<?php

namespace App\Http\Controllers;

use App\Models\MasterDocument;
use App\Models\MasterSection; // Asumsi ada model ini
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
        // Ambil data dokumen dengan relasi section
        // Kita gunakan paginate agar performa terjaga
        $documents = MasterDocument::with(['section'])
            ->when($request->search, function ($query, $search) {
                $query->where('nama_file', 'like', "%{$search}%");
            })
            ->latest() // Mengurutkan berdasarkan created_at desc (default Laravel)
            ->paginate(10)
            ->withQueryString();

        // Ambil data section untuk dropdown di form Create/Edit
        $sections = MasterSection::orderBy('section_order', 'asc')->get();

        return Inertia::render('document/page', [
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
        // 1. Validasi Input
        $validated = $request->validate([
            'id_section' => 'required|exists:tako-user.master_sections,id_section', // Pastikan koneksi & nama tabel benar
            'nama_file' => 'required|string|max:255',
            'attribute' => 'boolean',
            'description_file' => 'nullable|string',
            'link_url_video_file' => 'nullable|url', // Validasi format URL untuk video
            
            // Validasi File Upload (Opsional)
            'file_example' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:5120', // Max 5MB
            'file_template' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:5120',
        ]);

        // 2. Handle Upload File Example
        if ($request->hasFile('file_example')) {
            // Simpan ke storage/app/public/documents/examples
            $pathExample = $request->file('file_example')->store('documents/examples', 'public');
            $validated['link_path_example_file'] = $pathExample;
        }

        // 3. Handle Upload File Template
        if ($request->hasFile('file_template')) {
            $pathTemplate = $request->file('file_template')->store('documents/templates', 'public');
            $validated['link_path_template_file'] = $pathTemplate;
        }

        // 4. Tambahkan Updated By
        $validated['updated_by'] = Auth::id();

        // 5. Simpan ke Database
        MasterDocument::create($validated);

        return redirect()->back()->with('success', 'Dokumen berhasil ditambahkan.');
    }

    /**
     * Memperbarui dokumen.
     * Note: Parameter $id merujuk ke 'id_dokumen'
     */
    public function update(Request $request, $id)
    {
        $document = MasterDocument::findOrFail($id);

        // 1. Validasi Input
        $validated = $request->validate([
            'id_section' => 'required|exists:tako-user.master_sections,id_section',
            'nama_file' => 'required|string|max:255',
            'attribute' => 'boolean',
            'description_file' => 'nullable|string',
            'link_url_video_file' => 'nullable|url',
            
            // File bersifat nullable saat update (jika tidak diganti)
            'file_example' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:5120',
            'file_template' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:5120',
        ]);

        // 2. Handle Update File Example
        if ($request->hasFile('file_example')) {
            // Hapus file lama jika ada
            if ($document->link_path_example_file && Storage::disk('public')->exists($document->link_path_example_file)) {
                Storage::disk('public')->delete($document->link_path_example_file);
            }
            // Upload baru
            $validated['link_path_example_file'] = $request->file('file_example')->store('documents/examples', 'public');
        }

        // 3. Handle Update File Template
        if ($request->hasFile('file_template')) {
            // Hapus file lama jika ada
            if ($document->link_path_template_file && Storage::disk('public')->exists($document->link_path_template_file)) {
                Storage::disk('public')->delete($document->link_path_template_file);
            }
            // Upload baru
            $validated['link_path_template_file'] = $request->file('file_template')->store('documents/templates', 'public');
        }

        // 4. Update User
        $validated['updated_by'] = Auth::id();

        // 5. Update Database
        $document->update($validated);

        return redirect()->back()->with('success', 'Dokumen berhasil diperbarui.');
    }

    /**
     * Menghapus dokumen.
     */
    public function destroy($id)
    {
        $document = MasterDocument::findOrFail($id);

        // 1. Hapus File Fisik (Cleanup)
        if ($document->link_path_example_file && Storage::disk('public')->exists($document->link_path_example_file)) {
            Storage::disk('public')->delete($document->link_path_example_file);
        }

        if ($document->link_path_template_file && Storage::disk('public')->exists($document->link_path_template_file)) {
            Storage::disk('public')->delete($document->link_path_template_file);
        }

        // 2. Hapus Record Database
        $document->delete();

        return redirect()->back()->with('success', 'Dokumen berhasil dihapus.');
    }
}