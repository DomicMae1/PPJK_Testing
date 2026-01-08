<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\HsCode;
use App\Models\Spk;
use App\Models\Perusahaan;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use Clegginabox\PDFMerger\PDFMerger;
use Illuminate\Support\Str;
use Spatie\Browsershot\Browsershot;
use Symfony\Component\Process\Process;
use App\Services\SectionReminderService;

class ShippingController extends Controller
{
    public function index()
    {
        $user = auth('web')->user();
        $externalCustomers = [];

        // LOGIC 1: Jika User Adalah EKSTERNAL
        if ($user->role === 'eksternal') {
            // Ambil data perusahaan milik user tersebut berdasarkan id_customer di tabel users
            // Hasilnya hanya 1 data (Perusahaan dia sendiri)
            $externalCustomers = Customer::where('id_customer', $user->id_customer)
                ->select('id_customer', 'nama_perusahaan as nama') // Alias 'nama' agar frontend konsisten
                ->get();
        }
        else {
            // Ambil daftar user yang role-nya 'eksternal'
            // Ambil 'name' dari tabel users, tapi value-nya tetap id_customer
            $externalCustomers = User::where('role', 'eksternal')
                ->whereNotNull('id_customer') // Pastikan user tersebut terhubung ke customer
                ->select('id_customer', 'name as nama') // Ambil nama user sebagai label
                ->get();
            
            // Opsional: Jika ingin menghilangkan duplikasi (misal ada 2 user dari PT yang sama)
            // $externalCustomers = $externalCustomers->unique('id_customer')->values();
        }

        if (!$user->hasPermissionTo('view-master-shipping')) {
            throw UnauthorizedException::forPermissions(['view-master-shipping']);
        }

        $tenant = null;

        if ($user->id_perusahaan) {
            // Jika User Internal, ambil tenant dari id_perusahaan user
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            // Jika User Eksternal, cari customer dulu, baru ambil tenant dari ownership
            $customer = \App\Models\Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = \App\Models\Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        $spkData = [];

        // --- 3. JIKA TENANT KETEMU, BARU QUERY DATA ---
        if ($tenant) {
            // Pindah koneksi ke Database Tenant
            tenancy()->initialize($tenant);

            // Query ke tabel SPK (di database tenant)
            $query = \App\Models\Spk::with(['customer', 'creator']);

            // Jika user eksternal, filter hanya data miliknya
            if ($user->role === 'eksternal' && $user->id_customer) {
                $query->where('id_customer', $user->id_customer);
            }

            // Mapping data agar sesuai dengan kolom Frontend
            $spkData = $query->latest()->get()->map(function ($item) {
                return [
                    'id'              => $item->id,
                    'spk_code'        => $item->spk_code, // Sesuai permintaan
                    'nama_customer'   => $item->customer->nama_perusahaan ?? '-', // Sesuai permintaan
                    'tanggal_status'  => $item->created_at, // Sesuai permintaan
                    'status_label'    => 'diinput',
                    'nama_user'       => $item->creator->name ?? 'System',
                    'jalur'           => 'hijau', // Sesuai permintaan (Dummy dulu)
                ];
            });
        }

        return Inertia::render('m_shipping/page', [
            'customers' => $spkData,
            'externalCustomers' => $externalCustomers,
            'company' => [
                'id' => session('company_id'),
                'name' => session('company_name'),
                'logo' => session('company_logo'),
            ],
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $user = auth('web')->user();

        if (!$user->hasPermissionTo('create-master-shipping')) {
            throw UnauthorizedException::forPermissions(['create-master-shipping']);
        }

        return Inertia::render('m_shipping/table/add-data-form', [
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
        ]);
    }

    /**
     * Share the form to customer
     */
    public function share()
    {
        $user = auth('web')->user();

        if (!$user->hasPermissionTo('create-master-shipping')) {
            throw UnauthorizedException::forPermissions(['create-master-shipping']);
        }

        return Inertia::render('m_shipping/table/generate-data-form', [
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = auth('web')->user();

        // 1. Cek Permission
        if (!$user->hasPermissionTo('create-master-shipping')) {
            throw UnauthorizedException::forPermissions(['create-master-shipping']);
        }

        // 2. Validasi Input dari Frontend (React Dialog)
        $validated = $request->validate([
            'shipment_type' => 'required|in:Import,Export',
            'bl_number'     => 'required|string', // BL atau SI Number
            'id_customer'   => 'required|exists:customers,id_customer', // Pastikan nama kolom PK customer benar
            
            // Validasi Array HS Code
            'hs_codes'         => 'required|array|min:1',
            'hs_codes.*.code'  => 'required|string',
            'hs_codes.*.link'  => 'nullable|string', // Frontend kirim string kosong ''
            'hs_codes.*.file'  => 'nullable|file|image|mimes:jpeg,png,jpg|max:5120', // Max 5MB
        ]);

        $tenant = null;

        // Opsi A: User Internal (Punya id_perusahaan langsung)
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } 
        // Opsi B: User Eksternal (Cari via Customer Ownership)
        elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return redirect()->back()->withErrors([
                'error' => 'Gagal menentukan Tenant. Hubungi Administrator.'
            ]);
        }

        // 2. Inisialisasi Tenancy (Pindah Koneksi ke Database Tenant)
        // Ini akan otomatis mengubah koneksi default ke database 'tako_tenant_xxx'
        tenancy()->initialize($tenant);

        DB::beginTransaction();

        try {
            $createdHsCodeIds = [];

            foreach ($validated['hs_codes'] as $hsData) {
                $filePath = null; // Untuk kolom path_link_insw
                
                if (isset($hsData['file']) && $hsData['file'] instanceof \Illuminate\Http\UploadedFile) {
                    // 1. Generate nama file unik
                    $extension = $hsData['file']->getClientOriginalExtension();
                    $fileName = $hsData['code'] . '.' . $extension;
                    
                    // 2. Simpan fisik file ke C:/Users/IT/Herd/customers/...
                    $path = $hsData['file']->storeAs(
                        'documents/hs_codes', 
                        $fileName, 
                        'customers_external' // Disk custom Anda
                    );
                    
                    // 3. Set Variable untuk Database
                    $filePath = $path; // Simpan Path Internal (Relative)
                    
                    // // Generate URL Publik berdasarkan konfigurasi disk 'customers_external'
                    // $fileUrl = Storage::disk('customers_external')->url($path);
                }

                // CREATE DATA 
                $newHsCode = \App\Models\HsCode::create([
                    'hs_code'        => $hsData['code'],
                    
                    // LOGIC: Jika ada file, 'link_insw' diisi URL file. Jika tidak, ambil dari input (kosong)
                    'link_insw'      => $fileName ?? ($hsData['link'] ?? null),
                    
                    // Simpan Path Internal agar sistem tahu lokasi filenya
                    'path_link_insw' => $filePath, 
                    
                    'created_at'     => now(),
                    'updated_by'     => $user->id, 
                    'logs'           => json_encode(['action' => 'created', 'by' => $user->name, 'at' => now()]),
                ]);

                $createdHsCodeIds[] = $newHsCode->id_hscode;
            }

            $primaryHsCodeId = !empty($createdHsCodeIds) ? $createdHsCodeIds[0] : null;

            // CREATE SPK (Masuk ke DB Tenant)
            $spk = Spk::create([
                'spk_code'          => $validated['bl_number'],
                'shipment_type'     => $validated['shipment_type'],
                'id_perusahaan_int' => $user->id_perusahaan,
                'id_customer'       => $validated['id_customer'],
                'created_by'        => $user->id,
                'id_hscode'         => $primaryHsCodeId,
                'log'               => json_encode(['action' => 'created', 'by' => $user->name, 'at' => now()]),
            ]);

            DB::commit();

            return Inertia::location(route('shipping.show', $spk->id));

        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Gagal menyimpan data: ' . $th->getMessage()]);
        }
    }

    public function storePublic(Request $request)
    {

        DB::beginTransaction();

        $validated = $request->validate([
            'kategori_usaha' => 'required|string',
            'nama_perusahaan' => 'required|string',
            'bentuk_badan_usaha' => 'required|string',
            'alamat_lengkap' => 'required|string',
            'kota' => 'required|string',
            'no_telp' => 'nullable|string',
            'no_fax' => 'nullable|string',
            'alamat_penagihan' => 'required|string',
            'email' => 'required|email',
            'website' => 'nullable|string',
            'top' => 'nullable|string',
            'status_perpajakan' => 'nullable|string',
            'no_npwp' => 'nullable|string',
            'no_npwp_16' => 'nullable|string',
            'nama_pj' => 'nullable|string',
            'no_ktp_pj' => 'nullable|string',
            'no_telp_pj' => 'nullable|string',
            'nama_personal' => 'nullable|string',
            'jabatan_personal' => 'nullable|string',
            'no_telp_personal' => 'nullable|string',
            'email_personal' => 'nullable|email',
            'keterangan_reject' => 'nullable|string',
            'user_id' => 'required|exists:users,id',
            'approved_1_by' => 'nullable|integer',
            'approved_2_by' => 'nullable|integer',
            'rejected_1_by' => 'nullable|integer',
            'rejected_2_by' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'tgl_approval_1' => 'nullable|date',
            'tgl_approval_2' => 'nullable|date',
            'tgl_customer' => 'nullable|date',

            'attachments' => 'required|array',
            'attachments.*.nama_file' => 'required|string',
            'attachments.*.path' => 'required|string',
            'attachments.*.type' => 'required|in:npwp,sppkp,ktp,nib',
        ]);


        try {
            $userId = $request->input('user_id');
            DB::commit();

            return response()->json([
                'message' => 'Data Anda berhasil dibuat!',
            ], 200);
        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan: ' . $th->getMessage()], 500);
        }
    }

    // public function upload(Request $request)
    // {
    //     $file = $request->file('file');

    //     $filename = time() . '_' . $file->getClientOriginalName();

    //     $path = $file->storeAs('customers', $filename, 'public');

    //     $url = url(Storage::url($path)); 

    //     return response()->json([
    //         'path' => $url,           
    //         'nama_file' => $filename,
    //     ]);
    // }

    public function upload(Request $request)
    {
        // Validasi File
        $file = $request->file('pdf') ?? $request->file('file');
        if (!$file) {
            return response()->json(['error' => 'File tidak ditemukan'], 400);
        }

        // Ambil Parameter untuk Nama File
        $order       = str_pad((int)$request->input('order'), 3, '0', STR_PAD_LEFT);
        $npwp        = preg_replace('/[^0-9]/', '', $request->input('npwp_number'));
        $type        = strtolower($request->input('type'));

        // Simpan mode kompresi di nama file atau return ke frontend agar bisa dikirim balik saat store
        // Di sini kita hanya butuh nama file temp yang unik
        $ext         = $file->getClientOriginalExtension();
        $filename    = "{$npwp}-{$order}-{$type}.{$ext}";

        $disk        = Storage::disk('customers_external');
        $tempDir     = 'temp';

        // Buat folder temp jika belum ada
        if (!$disk->exists($tempDir)) {
            $disk->makeDirectory($tempDir);
        }

        // Simpan File RAW langsung ke Temp (Tanpa Kompresi)
        $tempRel = "{$tempDir}/{$filename}";

        // Gunakan stream untuk efisiensi memori saat save
        $disk->put($tempRel, file_get_contents($file->getRealPath()));

        return response()->json([
            'status'    => 'success',
            'path'      => $tempRel,        // Path ini akan dikirim balik saat submit
            'nama_file' => $filename,
            'is_temp'   => true,
            'info'      => 'File uploaded to temp (uncompressed)'
        ]);
    }

    public function processAttachment(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
            'nama_file' => 'required|string',
            'id_perusahaan' => 'nullable|integer',
            'mode' => 'nullable|string',
            'role' => 'nullable|string',
            'type' => 'nullable|string',
            'npwp_number' => 'nullable|string',
            'customer_id' => 'required|integer', // TAMBAHAN: Butuh ID Customer untuk cek urutan file terakhir
        ]);

        $tempPath = $request->path;
        $originalName = $request->nama_file;
        $mode = $request->mode ?? 'medium';
        $idPerusahaan = $request->id_perusahaan;
        $role = strtolower($request->role ?? 'user');
        $customerId = $request->customer_id;

        // 1. Setup Disk & Slug
        $disk = Storage::disk('customers_external');

        $companySlug = 'general';
        if ($idPerusahaan) {
            $perusahaan = Perusahaan::find($idPerusahaan);
            if ($perusahaan) {
                $companySlug = Str::slug($perusahaan->nama_perusahaan);
            }
        }

        if (!$disk->exists($tempPath)) {
            return response()->json(['error' => 'File temp tidak ditemukan'], 404);
        }

        // =========================================================
        // B. GENERATE NAMA FILE BARU
        // =========================================================

        $npwp = preg_replace('/[^0-9]/', '', $request->npwp_number) ?: '0000000000000000';

        $docType = $request->type ? strtolower($request->type) : 'document';

        // Mapping tipe dokumen
        if ($docType === 'lampiran_marketing') $docType = 'marketing_review';
        if ($docType === 'lampiran_auditor') $docType = 'audit_review';
        if ($docType === 'lampiran_review_general') {
            $docType = match ($role) {
                'manager'  => 'manager_review',
                'direktur' => 'director_review',
                'lawyer'   => 'lawyer_review',
                'auditor'  => 'audit_review',
                default    => 'document'
            };
        }

        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        // Gunakan $orderString hasil perhitungan di atas
        $newFileName = "{$npwp}-{$docType}.{$ext}";

        // =========================================================
        // C. TENTUKAN FOLDER TUJUAN
        // =========================================================

        $subFolder = ($role === 'user') ? 'attachment' : 'customers';
        if (in_array($docType, ['npwp', 'nib', 'sppkp', 'ktp'])) {
            $subFolder = 'attachment';
        }

        $targetDir = "{$companySlug}/{$subFolder}";
        if (!$disk->exists($targetDir)) {
            $disk->makeDirectory($targetDir);
        }

        $finalRelPath = "{$targetDir}/{$newFileName}";

        // =========================================================
        // D. PROSES KOMPRESI & PINDAH (LOGIC TETAP SAMA)
        // =========================================================

        $success = false;

        if ($ext === 'pdf') {
            $localInputName = 'gs_in_' . uniqid() . '.pdf';
            $localOutputName = 'gs_out_' . uniqid() . '.pdf';

            Storage::disk('local')->put("gs_processing/{$localInputName}", $disk->get($tempPath));

            $localInputPath = Storage::disk('local')->path("gs_processing/{$localInputName}");
            $localOutputPath = Storage::disk('local')->path("gs_processing/{$localOutputName}");

            $compressResult = $this->runGhostscript($localInputPath, $localOutputPath, $mode);

            if ($compressResult && file_exists($localOutputPath)) {
                $disk->put($finalRelPath, file_get_contents($localOutputPath));
                $success = true;
                @unlink($localOutputPath);
            } else {
                Log::warning("Ghostscript Gagal. Menggunakan file asli.");
            }
            @unlink($localInputPath);
        }

        if (!$success) {
            if ($disk->exists($finalRelPath)) $disk->delete($finalRelPath);
            $disk->move($tempPath, $finalRelPath);
        } else {
            if ($disk->exists($tempPath)) $disk->delete($tempPath);
        }

        return response()->json([
            'status' => 'success',
            'final_path' => $finalRelPath,
            'nama_file' => $newFileName,
            'compressed' => $success
        ]);
    }

    // Helper Ghostscript (Private)
    private function runGhostscript($inputPath, $outputPath, $mode)
    {
        $settings = [
            'small'  => ['-dPDFSETTINGS=/ebook', '-dColorImageResolution=150', '-dGrayImageResolution=150', '-dMonoImageResolution=150'],
            'medium' => ['-dPDFSETTINGS=/ebook', '-dColorImageResolution=200', '-dGrayImageResolution=200', '-dMonoImageResolution=200'],
            'high'   => ['-dPDFSETTINGS=/printer', '-dColorImageResolution=300', '-dGrayImageResolution=300', '-dMonoImageResolution=300'],
        ];
        $config = $settings[$mode] ?? $settings['medium'];

        // Deteksi OS untuk Path Ghostscript
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $gsExe = $isWindows ? 'C:\Program Files\gs\gs10.05.1\bin\gswin64c.exe' : '/usr/bin/gs';

        // Pastikan input path kompatibel dengan OS (terutama Windows backslashes)
        if ($isWindows) {
            $inputPath = str_replace('/', '\\', $inputPath);
            $outputPath = str_replace('/', '\\', $outputPath);
        }

        $cmd = array_merge([
            $gsExe,
            '-q',
            '-dSAFER',
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            '-o',
            $outputPath,
            $inputPath
        ], $config);

        try {
            $process = new Process($cmd);
            $process->setTimeout(300);
            $process->run();

            // Log Error Output jika gagal (Sangat membantu debugging)
            if (!$process->isSuccessful()) {
                Log::error('Ghostscript Error Output: ' . $process->getErrorOutput());
                return false;
            }

            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Exception $e) {
            Log::error("GS Process Exception: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $user = auth('web')->user();

        // 2. LOGIKA MENCARI TENANT (Copy dari function store)
        // Kita harus tahu dulu user ini milik tenant mana agar bisa buka databasenya
        $tenant = null;

        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } 
        elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            abort(404, 'Tenant tidak ditemukan untuk user ini.');
        }

        // 3. INISIALISASI TENANCY (PENTING!)
        // Ini yang memindahkan koneksi dari 'tako-user' ke 'tako_tenant_xxx'
        tenancy()->initialize($tenant);

        // 4. Baru sekarang aman untuk Query ke tabel SPK
        // Karena koneksi sudah pindah ke tenant
        $spk = Spk::with(['hsCodeData'])->findOrFail($id);

        // 2. Format Data sesuai kebutuhan Frontend (shipmentData)
        $shipmentData = [
            'id_spk'    => $spk->id,
            // Format tanggal: 12/11/25 17.14 WIB
            'spkDate'   => Carbon::parse($spk->created_at)->format('d/m/y H.i') . ' WIB',
            'type'      => $spk->shipment_type,
            'siNumber'  => $spk->spk_code, // Mapping spk_code ke siNumber
            'hsCodes'   => [],
        ];

        // 3. Mapping HS Code
        // Catatan: Karena struktur DB saat ini one-to-one (spk belongsTo hsCode),
        // maka array ini hanya akan berisi 1 item.
        if ($spk->hsCodeData) {
            $shipmentData['hsCodes'][] = [
                'id'   => $spk->hsCodeData->id_hscode,
                'code' => $spk->hsCodeData->hs_code,
                'link' => $spk->hsCodeData->path_link_insw, // Link INSW
            ];
        }

        return Inertia::render('m_shipping/table/view-data-form', [
            'customer' => $spk->customer,
            'shipmentDataProp' => $shipmentData,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Spk $customer)
    {
        $user = auth('web')->user();

        $customer->load('attachments');

        return Inertia::render('m_shipping/table/edit-data-form', [
            'customer' => $customer->load('attachments'),
        ]);
    }


    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Spk $customer)
    {
        $user = auth('web')->user();

        $createdDate = \Carbon\Carbon::parse($customer->created_at)->toDateString();
        $today = now()->toDateString();

        $canEditToday = $createdDate === $today;

        $validated = $request->validate([
            'kategori_usaha' => 'required|string',
            'nama_perusahaan' => 'required|string',
            'bentuk_badan_usaha' => 'required|string',
            'alamat_lengkap' => 'required|string',
            'kota' => 'required|string',
            'no_telp' => 'nullable|string',
            'no_fax' => 'nullable|string',
            'alamat_penagihan' => 'required|string',
            'email' => 'required|email',
            'website' => 'nullable|string',
            'top' => 'nullable|string',
            'status_perpajakan' => 'nullable|string',
            'no_npwp' => 'nullable|string',
            'no_npwp_16' => 'nullable|string',
            'nama_pj' => 'nullable|string',
            'no_ktp_pj' => 'nullable|string',
            'no_telp_pj' => 'nullable|string',
            'nama_personal' => 'nullable|string',
            'jabatan_personal' => 'nullable|string',
            'no_telp_personal' => 'nullable|string',
            'email_personal' => 'nullable|email',
            'keterangan_reject' => 'nullable|string',
            'user_id' => 'required|exists:users,id',
            'approved_1_by' => 'nullable|integer',
            'approved_2_by' => 'nullable|integer',
            'rejected_1_by' => 'nullable|integer',
            'rejected_2_by' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'tgl_approval_1' => 'nullable|date',
            'tgl_approval_2' => 'nullable|date',
            'tgl_customer' => 'nullable|date',

            'attachments' => 'required|array',
            'attachments.*.nama_file' => 'required|string',
            'attachments.*.path' => 'required|string',
            'attachments.*.type' => 'required|in:npwp,sppkp,ktp,nib',
        ]);

        try {
            DB::beginTransaction();

            $customer->update($validated);
            $roles = $user->getRoleNames();

            DB::commit();
            return redirect()->route('shipping.index')->with('success', 'Data Shipping berhasil diperbarui!');
        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan: ' . $th->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Spk $customer)
    {

        try {
            DB::beginTransaction();

            $customer->delete();

            DB::commit();

            return redirect()->route('shipping.index')
                ->with('success', 'Data Shipping berhasil dihapus (soft delete)!');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->route('shipping.index')
                ->with('error', 'Gagal menghapus Data Shipping: ' . $e->getMessage());
        }
    }

    public function generatePdf($id)
    {
        Log::info("📄 Mulai generate PDF untuk Shipping ID: {$id}");

        $customer = Spk::with(['attachments', 'perusahaan'])->findOrFail($id);
        $user = auth('web')->user();

        $tempDir = storage_path("app/temp");
        if (!file_exists($tempDir)) {
            mkdir($tempDir, 0755, true);
            Log::info("📁 Folder temp dibuat: {$tempDir}");
        }

        $mainPdfPath = "{$tempDir}/customer_{$customer->id}_main.pdf";
        $mainPdf = Pdf::loadView('pdf.customer', [
            'customer' => $customer,
            'generated_by' => $user?->name ?? 'Guest',
        ])->setPaper('a4');
        file_put_contents($mainPdfPath, $mainPdf->output());

        $attachmentPdfPaths = [];

        foreach ($customer->attachments as $attachment) {
            if (!in_array($attachment->type, ['npwp', 'nib', 'ktp'])) continue;

            $parsedPath = parse_url($attachment->path, PHP_URL_PATH);
            $relativePath = str_replace('/storage/', '', $parsedPath);
            $localPath = storage_path("app/public/{$relativePath}");

            if (!file_exists($localPath)) continue;

            if (Str::endsWith(strtolower($localPath), '.pdf')) {
                $attachmentPdfPaths[] = $localPath;
            } else {
                $convertedPdfPath = "{$tempDir}/converted_" . $attachment->type . "_{$customer->id}.pdf";
                $html = view('pdf.attachment-wrapper', [
                    'title' => strtoupper($attachment->type),
                    'filePath' => $localPath,
                    'extension' => pathinfo($localPath, PATHINFO_EXTENSION),
                ])->render();

                $converted = Pdf::loadHTML($html)->setPaper('a4');
                file_put_contents($convertedPdfPath, $converted->output());

                $attachmentPdfPaths[] = $convertedPdfPath;
            }
        }

        $mergedPath = "{$tempDir}/customer_{$customer->id}.pdf";
        try {
            $this->mergePdfsWithGhostscript(array_merge([$mainPdfPath], $attachmentPdfPaths), $mergedPath);

            if (!file_exists($mergedPath) || filesize($mergedPath) < 1000) {
                Log::error("❌ Merge gagal atau file terlalu kecil: {$mergedPath}");
                throw new \Exception('Merge PDF gagal.');
            }

            $finalPath = $mergedPath;
        } catch (\Throwable $e) {
            Log::error("⚠️ Ghostscript gagal, fallback ke main PDF. Error: " . $e->getMessage());
            $finalPath = $mainPdfPath;
        }

        Log::info("✅ Proses selesai, kirim file ke user.");

        return response()->download($finalPath, "customer_{$customer->id}.pdf", [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="customer_' . $customer->id . '.pdf"',
        ])->deleteFileAfterSend(true);
    }

    private function mergePdfsWithGhostscript(array $inputPaths, string $outputPath)
    {
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $gsCmd = $isWindows ? 'gswin64c' : 'gs';

        $inputFiles = implode(' ', array_map(function ($path) {
            return '"' . str_replace('\\', '/', $path) . '"';
        }, $inputPaths));

        $outputFile = '"' . str_replace('\\', '/', $outputPath) . '"';
        $cmd = "{$gsCmd} -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -sOutputFile={$outputFile} {$inputFiles}";

        exec($cmd . ' 2>&1', $output, $returnVar);

        if ($returnVar !== 0) {
            throw new \Exception("Ghostscript gagal menggabungkan PDF. Kode: {$returnVar}");
        }
    }

        public function sectionReminder(Request $request)
    {
        $validated = $request->validate([
            'section' => 'required|string',
            'spk_id' => 'required|integer',
        ]);

        $user = auth('web')->user();

        if ($user->role === 'eksternal') {
            // Cari perusahaan terkait
            $perusahaan = \App\Models\Perusahaan::find($user->id_perusahaan);
            if (!$perusahaan) {
                return redirect()->back()->withErrors(['error' => 'Perusahaan tidak ditemukan']);
            }

            // Cari user internal dengan role staff di perusahaan ini
            $staff = \App\Models\User::where('id_perusahaan', $perusahaan->id_perusahaan)
                ->where('role', 'internal')
                ->where('role_internal', 'staff')
                ->first();

            // --- INISIALISASI TENANT ---
            $tenant = \App\Models\Tenant::where('perusahaan_id', $perusahaan->id_perusahaan)->first();
            if ($tenant) {
                tenancy()->initialize($tenant);
            }

            // Ambil data SPK jika ada (sudah di koneksi tenant)
            $spk = \App\Models\Spk::find($validated['spk_id']);

            if (!$spk) {
                return redirect()->back()->withErrors(['error' => 'SPK tidak ditemukan pada tenant DB']);
            }

            try {
                SectionReminderService::send($validated['section'], $staff, $user, $spk);
                return redirect()->back()->with('success', 'Reminder berhasil dikirim ke staff.');
            } catch (\Throwable $e) {
                return redirect()->back()->withErrors(['error' => 'Gagal mengirim email: ' . $e->getMessage()]);
            }
        }

        return redirect()->back();
    }
}
