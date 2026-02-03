<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\DocumentTrans;
use App\Models\HsCode;
use App\Models\MasterDocument;
use App\Models\MasterDocumentTrans;
use App\Models\Spk;
use App\Models\Perusahaan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\MasterSection;
use App\Models\SectionTrans;
use App\Models\DocumentStatus;
use App\Events\ShippingDataUpdated;
use App\Models\SpkStatus;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
use App\Services\NotificationService;
use App\Jobs\GhostscriptCompressionJob;
use Illuminate\Support\Facades\Auth; 

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
            $query = Spk::with([
                'customer', 
                'creator', 
                'latestStatus',
                'sections' => function ($q) {
                    // 1. Urutkan section agar rapi
                    $q->orderBy('section_order', 'asc');
                    
                    // 2. Pilih kolom spesifik (Opsional, tapi bagus untuk performa)
                    // Pastikan 'id' dan 'id_spk' terpilih agar relasi tetap jalan
                    $q->select('id', 'id_spk', 'section_name', 'section_order', 'deadline', 'deadline_date');
                    
                    // 3. Relasi 'documents' DIHILANGKAN sesuai permintaan
                }
            ]);

            // Jika user eksternal, filter hanya data miliknya
            if ($user->role === 'eksternal' && $user->id_customer) {
                $query->where('id_customer', $user->id_customer);
            }

            // Mapping data agar sesuai dengan kolom Frontend
            $spkData = $query->latest()->get()->map(function ($item) {
                $maxDeadline = $item->sections->pluck('deadline_date')->filter()->max();
                return [
                    'id'              => $item->id,
                    'spk_code'        => $item->spk_code, // Sesuai permintaan
                    'nama_customer'   => $item->customer->nama_perusahaan ?? '-', // Sesuai permintaan
                    'tanggal_status'  => $item->created_at, // Sesuai permintaan
                    'status_label'    => $item->latestStatus->status ?? 'Draft/Pending',
                    'nama_user'       => $item->creator->name ?? 'System',
                    'jalur'           => $item->penjaluran, // Sesuai permintaan (Dummy dulu)
                    'deadline_date'   => $maxDeadline,
                ];
            });
        }

        // NEW: Fetch Internal Staff for Supervisor Assignment
        $internalStaff = [];
        if ($user->role === 'internal') {
            $internalStaff = \App\Models\User::on('tako-user')
                ->where('role', 'internal')
                ->where('role_internal', 'staff')
                ->where('id_perusahaan', $user->id_perusahaan)
                ->select('id_user', 'name')
                ->get();
        }

        return Inertia::render('m_shipping/page', [
            'customers' => $spkData,
            'externalCustomers' => $externalCustomers,
            'internalStaff' => $internalStaff, // Pass staff list
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

        $userId = $user->id_user;
        $userName = $user->name;
        
        if (!$user->hasPermissionTo('create-master-shipping')) {
            throw UnauthorizedException::forPermissions(['create-master-shipping']);
        }

        $validated = $request->validate([
            'shipment_type'   => 'required|in:Import,Export',
            'bl_number'       => 'required|string',
            'id_customer'     => 'required|exists:customers,id_customer',
            'hs_codes'        => 'required|array|min:1',
            'hs_codes.*.code' => 'required|string',
            'hs_codes.*.link' => 'nullable|string',
            'hs_codes.*.file' => 'nullable|file|image|mimes:jpeg,png,jpg|max:5120',
            'assigned_pic'    => 'nullable|integer|exists:users,id_user', // Validasi Assigned PIC
        ]);

        // --- Logic Tenant ---
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return redirect()->back()->withErrors(['error' => 'Gagal menentukan Tenant.']);
        }

        tenancy()->initialize($tenant);

        DB::beginTransaction();

        try {
            // 1. CREATE SPK (Hanya Sekali)
            $spk = Spk::create([
                'spk_code'          => $validated['bl_number'],
                'shipment_type'     => $validated['shipment_type'],
                'id_perusahaan_int' => $user->id_perusahaan,
                'id_customer'       => $validated['id_customer'],
                'created_by'        => $userId,
                'penjaluran'        => null,
            ]);

            $statusId = 6;
            $statusPriority = 'Created';

            SpkStatus::create([
                'id_spk'    => $spk->id,
                'id_status' => $statusId,
                'status'  => "SPK $statusPriority",
            ]);

            // 2. LOOP CREATE HS CODES
            foreach ($validated['hs_codes'] as $index => $hsData) {
                $filePath = null;
                $fileNameToSave = null;

                if (isset($hsData['file']) && $hsData['file'] instanceof \Illuminate\Http\UploadedFile) {
                    $extension = $hsData['file']->getClientOriginalExtension();
                    $fileNameToSave = $hsData['code'] . '_' . uniqid() . '.' . $extension;
                    
                    $path = $hsData['file']->storeAs(
                        'documents/hs_codes', 
                        $fileNameToSave, 
                        'customers_external'
                    );
                    $filePath = $path;
                }

                $newHsCode = HsCode::create([
                    'id_spk'         => $spk->id,
                    'hs_code'        => $hsData['code'],
                    'link_insw'      => $fileNameToSave ?? ($hsData['link'] ?? null),
                    'path_link_insw' => $filePath,
                    'created_by'     => $userId,
                    'updated_by'     => $userId,
                    'logs'           => json_encode(['action' => 'created', 'by' => $user->name, 'at' => now()]),
                ]);
            }

            // --- 3. GENERATE SECTION TRANSAKSI ---
            // Mengambil section dari DB Master (Global) dan copy ke Transaksi (Tenant)
            $masterSections = MasterSection::on('tako-user')->get();

            foreach ($masterSections as $masterSec) {
                SectionTrans::create([
                    'id_section'    => $masterSec->id_section,
                    'id_spk'        => $spk->id,
                    'section_name'  => $masterSec->section_name,
                    'section_order' => $masterSec->section_order,
                    'deadline'      => false,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }

            // --- 4. GENERATE DOKUMEN TRANSAKSI (UPDATED LOGIC) ---
            // Alur: MasterDocument (Global) -> MasterDocumentTrans (Tenant) -> DocumentTrans (Tenant Transaction)
            
            $masterDocs = MasterDocument::on('tako-user')->with('section')->get();

            foreach ($masterDocs as $masterDoc) {
                // A. Simpan/Cek dahulu ke Master Document Trans (Di Database Tenant)
                $masterDocTrans = MasterDocumentTrans::firstOrCreate(
                    [
                        'id_section' => $masterDoc->id_section,
                        'nama_file'  => $masterDoc->nama_file,
                    ],
                    [
                        // Data yang akan dicopy jika belum ada
                        'is_internal'             => $masterDoc->is_internal,
                        'is_verification'         => $masterDoc->is_verification ?? true, // New: Copy flag, default true
                        'attribute'               => $masterDoc->attribute,
                        'link_path_example_file'  => $masterDoc->link_path_example_file,
                        'link_path_template_file' => $masterDoc->link_path_template_file,
                        'link_url_video_file'     => $masterDoc->link_url_video_file,
                        'description_file'        => $masterDoc->description_file,
                        'updated_by'              => $userId,
                    ]
                );

                // Siapkan Log Message
                $sectionName = $masterDoc->section ? $masterDoc->section->section_name : 'Unknown Section';
                $logMessage = "Document {$sectionName} requested " . now()->format('d-m-Y H:i') . " WIB";

                // B. Buat Document Transaksi (Nyata)
                $newDocTrans = DocumentTrans::create([
                    'id_spk'                     => $spk->id,
                    'id_dokumen'                 => $masterDocTrans->id_dokumen, // Menggunakan PK dari MasterDocumentTrans
                    'id_section'                 => $masterDocTrans->id_section,
                    'nama_file'                  => $masterDocTrans->nama_file,
                    'is_internal'                => $masterDocTrans->is_internal ?? false,
                    'is_verification'            => $masterDocTrans->is_verification ?? true, // New: from Master
                    'url_path_file'              => null,
                    'verify'                     => false,
                    'correction_attachment'      => false,
                    'kuota_revisi'               => 3,
                    'updated_by'                 => $userId,
                    'logs'                       => $logMessage,
                    'created_at'                 => now(),
                    'updated_at'                 => now(),
                ]);

                // Create Initial Status
                DocumentStatus::create([
                    'id_dokumen_trans' => $newDocTrans->id,
                    'status'           => $logMessage,
                    'by'               => $userId,
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);
            }

            if ($user->role === 'internal') {
                if ($user->role_internal === 'supervisor' && !empty($validated['assigned_pic'])) {
                    // SUPERVISOR: Assign to Selected Staff
                    $spk->update(['validated_by' => $validated['assigned_pic']]);
                    
                    // Optional: Notification Logic to Assigned Staff can be added here
                    /* NotificationService::send([...]); */

                } elseif ($user->role_internal === 'staff') {
                   // STAFF: Auto-assign to Self
                   $spk->update(['validated_by' => $userId]);
                }
            }

            DB::commit();

            // --- 5. NOTIFICATION LOGIC (MOVED AFTER COMMIT) ---
            // Move here to prevent Race Condition (Queue Worker checking DB before Commit)
            try {
                if ($user->role === 'eksternal') {
                    // Find all Internal Users with role_internal == 'staff'
                    // WARNING: Need to query Central USERS table (tako-user)
                    $staffUsers = \App\Models\User::on('tako-user')
                        ->where('role', 'internal')
                        ->where('role_internal', 'staff') // Assuming single value column as per instruction
                        ->distinct()
                        ->get();
                        
                    // Ensure unique by ID (collection level)
                    $staffUsers = $staffUsers->unique('id_user')->values();
                    
                    foreach ($staffUsers as $staff) {
                         // 1. Send Email
                        try {
                            SectionReminderService::sendSpkCreated($staff, $spk, $user);
                        } catch (\Exception $e) {
                             Log::error("Failed to send SPK Created Email to {$staff->email}: " . $e->getMessage());
                        }

                        // 2. Send In-App Notification
                        try {
                            NotificationService::send([
                                'send_to' => $staff->id_user,
                                'created_by' => $userId,
                                'role' => 'internal', // Context
                                'id_spk' => $spk->id,
                                'data' => [
                                    'type' => 'spk_created',
                                    'title' => 'New SPK Created',
                                    'message' => "New SPK {$spk->spk_code} created by {$user->name}",
                                    'url' => "/shipping/{$spk->id}",
                                    'spk_code' => $spk->spk_code
                                ]
                            ]);
                        } catch (\Exception $e) {
                             Log::error("Failed to send SPK Created Notification to {$staff->id_user}: " . $e->getMessage());
                        }
                    }
                } elseif ($user->role === 'internal') {
                    // Fetch Customer Name for Notification Context
                    $customerName = 'Unknown Customer';
                    $customerObj = Customer::find($validated['id_customer']);
                    if ($customerObj) {
                        $customerName = $customerObj->nama_cust ?? $customerObj->nama_perusahaan ?? $customerName;
                    }

                    // 1. If Supervisor & Assigned Staff -> Notify the Staff
                    if ($user->role_internal === 'supervisor' && !empty($validated['assigned_pic'])) {
                        $assignedStaff = \App\Models\User::on('tako-user')->find($validated['assigned_pic']);
                        if ($assignedStaff) {
                             // Email
                            try {
                                SectionReminderService::sendSpkCreated($assignedStaff, $spk, $user);
                            } catch (\Exception $e) {
                                Log::error("Failed to send Assignment Email to Staff {$assignedStaff->email}: " . $e->getMessage());
                            }

                            // Notification
                            try {
                                NotificationService::send([
                                    'send_to' => $assignedStaff->id_user,
                                    'created_by' => $userId,
                                    'role' => 'internal',
                                    'id_spk' => $spk->id,
                                    'data' => [
                                        'type' => 'spk_created',
                                        'title' => 'Penunjukan PIC SPK', // Assignment Title
                                        // "kamu menjadi pic untuk customer berikut"
                                        'message' => "Anda telah ditunjuk sebagai PIC untuk customer {$customerName} (SPK: {$spk->spk_code}) oleh {$user->name}",
                                        'url' => "/shipping/{$spk->id}",
                                        'spk_code' => $spk->spk_code
                                    ]
                                ]);
                            } catch (\Exception $e) {
                                Log::error("Failed to send Assignment Notification to {$assignedStaff->id_user}: " . $e->getMessage());
                            }
                        }
                    }

                   // 2. Notify External Customer (For both Staff and Supervisor)
                   // We query the central user table for users of this customer
                   $externalUsers = \App\Models\User::on('tako-user')
                        ->where('id_customer', $spk->id_customer)
                        ->where('role', 'eksternal')
                        ->get();

                   foreach ($externalUsers as $extUser) {
                        // Email
                        try {
                            SectionReminderService::sendSpkCreated($extUser, $spk, $user);
                        } catch (\Exception $e) {
                             Log::error("Failed to send SPK Email to External {$extUser->email}: " . $e->getMessage());
                        }
                        
                        // Notification
                        try {
                            NotificationService::send([
                                'send_to' => $extUser->id_user,
                                'created_by' => $userId,
                                'role' => 'eksternal',
                                'id_spk' => $spk->id,
                                'data' => [
                                    'type' => 'spk_created',
                                    'title' => 'SPK Baru Dibuat',
                                    'message' => "SPK Baru {$spk->spk_code} telah dibuat oleh {$user->name}",
                                    'url' => "/shipping/{$spk->id}",
                                    'spk_code' => $spk->spk_code
                                ]
                            ]);
                        } catch (\Exception $e) {
                             Log::error("Failed to send SPK Notification to External {$extUser->id_user}: " . $e->getMessage());
                        }
                   }
                }
                
                 // REALTIME UPDATE (Backup for other lists)
                 try {
                    ShippingDataUpdated::dispatch($spk->id, 'create');
                } catch (\Exception $e) {
                    Log::error('Realtime update failed: ' . $e->getMessage());
                }

            } catch (\Exception $e) {
                Log::error("Post-commit notification failed: " . $e->getMessage());
            }

            return Inertia::location(route('shipping.show', $spk->id));

        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Gagal: ' . $th->getMessage()]);
        }
    }

    public function updateHsCodes(Request $request, $idSpk)
    {
        $user = auth('web')->user();

        $validated = $request->validate([
            'hs_codes'        => 'required|array|min:1',
            // id opsional karena data baru belum punya ID
            'hs_codes.*.id'   => 'nullable', 
            'hs_codes.*.code' => 'required|string',
            // Link lama (string) atau file baru (binary)
            'hs_codes.*.file' => 'nullable', 
        ]);

        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) abort(404, 'Tenant not found');
        tenancy()->initialize($tenant);

        // 3. Mulai Transaksi Database
        DB::beginTransaction();

        try {
            $spk = Spk::findOrFail($idSpk);

            $receivedIds = [];

            foreach ($validated['hs_codes'] as $item) {
                $filePath = null;
                $fileNameToSave = null;
                if (isset($item['file']) && $item['file'] instanceof \Illuminate\Http\UploadedFile) {
                    $extension = $item['file']->getClientOriginalExtension();
                    $fileNameToSave = $item['code'] . '_' . uniqid() . '.' . $extension;
                    
                    $path = $item['file']->storeAs(
                        'documents/hs_codes', 
                        $fileNameToSave, 
                        'customers_external'
                    );
                    $filePath = $path; 
                }

                if (!empty($item['id']) && is_numeric($item['id'])) {
                    $hsCode = HsCode::find($item['id']);
                    if ($hsCode) {
                        $updateData = [
                            'hs_code'    => $item['code'],
                            'updated_by' => $user->id,
                            'updated_at' => now(),
                        ];

                        // Hanya update file jika ada file baru
                        if ($filePath) {
                            $updateData['link_insw'] = $fileNameToSave;
                            $updateData['path_link_insw'] = $filePath;
                        } 

                        $hsCode->update($updateData);
                        $receivedIds[] = $hsCode->id_hscode;
                    }
                } else {
                    $newHsCode = HsCode::create([
                        'id_spk'         => $spk->id,
                        'hs_code'        => $item['code'],
                        'link_insw'      => $fileNameToSave, 
                        'path_link_insw' => $filePath, 
                        'created_by'     => $user->id,
                        'updated_by'     => $user->id,
                        'logs'           => json_encode(['action' => 'added_via_edit', 'by' => $user->name, 'at' => now()]),
                    ]);
                    $receivedIds[] = $newHsCode->id_hscode;
                }
            }
            HsCode::where('id_spk', $spk->id)
                  ->whereNotIn('id_hscode', $receivedIds)
                  ->delete();

            if (!empty($receivedIds)) {
                $spk->update(['id_hscode' => $receivedIds[0]]);
            } else {
                $spk->update(['id_hscode' => null]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'HS Codes updated successfully');

        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to update: ' . $th->getMessage()]);
        }
    }

    public function upload(Request $request)
    {
        // Validasi File
        $file = $request->file('pdf') ?? $request->file('file');
        if (!$file) {
            return response()->json(['error' => 'File tidak ditemukan'], 400);
        }

        $spk        = $request->input('spk_code');
        $type        = strtolower($request->input('type'));

        $ext         = $file->getClientOriginalExtension();
        $uniqueId = uniqid();
        $filename    = "{$spk}-{$type}-{$uniqueId}.{$ext}";

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

    public function submit(Request $request)
    {

        // $request->validate([
        //     'customer_id' => 'required|exists:tako-perusahaan.customers_statuses,id_Customer',
        //     'keterangan' => 'nullable|string',
        //     'attach_path'         => 'nullable|string',
        //     'attach_filename'     => 'nullable|string',
        //     'submit_1_timestamps' => 'nullable|date',
        //     'status_1_timestamps' => 'nullable|date',
        //     'status_2_timestamps' => 'nullable|date',
        // ]);

        // $status = Customers_Status::where('id_Customer', $request->customer_id)->first();
        // if (!$status) return back()->with('error', 'Data status customer tidak ditemukan.');

        // $customer = $status->customer;

        // // 1. Ambil Info Perusahaan untuk Folder Name
        // $idPerusahaan = $request->input('id_perusahaan');
        // $perusahaan = Perusahaan::find($idPerusahaan);

        // // Default slug jika perusahaan tidak ketemu
        // $companySlug = 'general';
        // $emailsToNotify = [];

        // if ($perusahaan) {
        //     $companySlug = Str::slug($perusahaan->nama_perusahaan);

        //     if (!empty($perusahaan->notify_1)) {
        //         $emailsToNotify = explode(',', $perusahaan->notify_1);
        //     }
        // }

        // $status = Customers_Status::where('id_Customer', $request->customer_id)->first();

        // if (!$status) {
        //     return back()->with('error', 'Data status customer tidak ditemukan.');
        // }

        // $user = Auth::user();
        // $userId = $user->id;
        // $rawRole  = strtolower($user->getRoleNames()->first());

        // $roleMap = [
        //     'marketing' => 'user',
        //     'user'      => 'user',
        //     'manager'   => 'manager',
        //     'direktur'  => 'direktur',
        //     'director'  => 'direktur',
        //     'lawyer'    => 'lawyer',
        //     'auditor'   => 'auditor',
        // ];

        // $role = $roleMap[$rawRole] ?? $rawRole;
        // $now = Carbon::now();

        // $triggerRoles = ['user', 'manager', 'direktur'];

        // // Cek apakah User yang submit termasuk role tersebut
        // if (in_array($role, $triggerRoles)) {

        //     $potentialDuplicates = Customer::with('perusahaan') // Only eager load same-db relations
        //         ->whereKeyNot($customer->id)
        //         ->where(function ($q) use ($customer) {
        //             $q->where('no_npwp', $customer->no_npwp)
        //                 ->when($customer->no_npwp_16, fn($sq) => $sq->orWhere('no_npwp_16', $customer->no_npwp_16));
        //         })
        //         ->orderBy('created_at', 'desc')
        //         ->get();

        //     $problematicCustomer = null;

        //     // 2. Loop and check status manually
        //     foreach ($potentialDuplicates as $duplicate) {
        //         // Explicitly use the correct model and connection
        //         $dupStatus = \App\Models\Customers_Status::on('tako-perusahaan')
        //             ->where('id_Customer', $duplicate->id)
        //             ->first();

        //         if (!$dupStatus) continue;

        //         // Check for issues
        //         $isRejected = strtolower($dupStatus->status_3 ?? '') === 'rejected';
        //         $hasAuditorNote = !empty($dupStatus->status_4_keterangan)
        //             && $dupStatus->status_4_keterangan != '-'
        //             && trim($dupStatus->status_4_keterangan) != '';

        //         if ($isRejected || $hasAuditorNote) {
        //             // We found a problematic one!
        //             // Manually attach the status to the duplicate object so the email view can use it
        //             $duplicate->setRelation('status', $dupStatus);
        //             $problematicCustomer = $duplicate;
        //             break;
        //         }
        //     }

        //     // Jika ditemukan data lama yang bermasalah, KIRIM EMAIL
        //     if ($problematicCustomer) {

        //         // A. Ambil Email Tujuan (Internal Perusahaan yang memiliki data ini)
        //         // Mengambil dari kolom 'notify_1' pada tabel perusahaan
        //         $emailsToNotify = [];
        //         if ($perusahaan && !empty($perusahaan->notify_1)) {
        //             $emailsToNotify = explode(',', $perusahaan->notify_1);
        //         }

        //         // Fallback (Jaga-jaga jika email kosong)
        //         if (empty($emailsToNotify)) {
        //             $emailsToNotify = ['default@internal-perusahaan.com'];
        //         }

        //         // B. Filter Email (Validasi format)
        //         $validEmails = collect($emailsToNotify)
        //             ->map(fn($email) => trim($email))
        //             ->filter(fn($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
        //             ->unique()
        //             ->toArray();

        //         // dd([$problematicCustomer->status], [$customer->id]);

        //         // C. Eksekusi Pengiriman
        //         if (!empty($validEmails)) {
        //             Log::info("Mengirim Alert Duplikat NPWP (Oleh: $role) ke:", $validEmails);

        //             try {
        //                 // GANTI CLASS INI
        //                 Mail::to($validEmails)->send(new \App\Mail\CustomerAlert(
        //                     $user,                                                      // User yang submit
        //                     $customer,                                                  // Customer baru
        //                     $problematicCustomer,                                       // Customer lama
        //                     $problematicCustomer->status,
        //                 ));
        //             } catch (\Exception $e) {
        //                 Log::error("Gagal kirim email alert duplikat: " . $e->getMessage());
        //             }
        //         }
        //     }
        // }

        // if ($request->filled('submit_1_timestamps')) $status->submit_1_timestamps = $request->input('submit_1_timestamps');
        // if ($request->filled('status_1_timestamps')) {
        //     $status->status_1_timestamps = $request->input('status_1_timestamps');
        //     $status->status_1_by = $userId;
        // }
        // if ($request->filled('status_2_timestamps')) {
        //     $status->status_2_timestamps = $request->input('status_2_timestamps');
        //     $status->status_2_by = $userId;
        // }
        // $isDirekturCreator = ($customer->id_user === $userId && $role === 'direktur');
        // $isManagerCreator = ($customer->id_user === $userId && $role === 'manager');

        // // $customer = $status->customer;

        // // if ($request->hasFile('attach') && !$request->filled('attach_path')) {

        // //     $file = $request->file('attach');

        // //     $tempName = 'temp_' . uniqid() . '.pdf';
        // //     $tempPath = 'temp/' . $tempName;

        // //     Storage::disk('customers_external')->put(
        // //         $tempPath,
        // //         file_get_contents($file->getRealPath())
        // //     );

        // //     $request->merge([
        // //         'attach_path'     => $tempPath,
        // //         'attach_filename' => $file->getClientOriginalName(),
        // //     ]);
        // // }

        // $finalFilename = $request->input('attach_filename');
        // $finalPath = $request->input('attach_path');

        // if (!in_array($role, ['user', 'manager', 'direktur', 'lawyer', 'auditor'])) {
        //     $finalFilename = null;
        //     $finalPath = null;
        // }

        // switch ($role) {
        //     case 'user':
        //         $status->submit_1_timestamps = $now;
        //         if ($finalFilename && $finalPath) {
        //             $status->submit_1_nama_file = $finalFilename;
        //             $status->submit_1_path = $finalPath;
        //         }

        //         // 🔹 Kirim email hanya jika perusahaan TIDAK punya manager
        //         // if ($perusahaan && !$perusahaan->hasManager()) {
        //         //     if (!empty($perusahaan->notify_1)) {
        //         //         $emailsToNotify = explode(',', $perusahaan->notify_1);
        //         //     }

        //         //     if (!empty($emailsToNotify)) {
        //         //         try {
        //         //             Mail::to($emailsToNotify)->send(new \App\Mail\CustomerSubmittedMail($customer));
        //         //         } catch (\Exception $e) {
        //         //             Log::error("Gagal kirim email lawyer (tanpa manager): " . $e->getMessage());
        //         //         }
        //         //     }
        //         // }

        //         break;

        //     case 'manager':
        //         $status->status_1_by = $userId;
        //         $status->status_1_timestamps = $now;
        //         $status->status_1_keterangan = $request->keterangan;
        //         if ($finalFilename && $finalPath) {
        //             $status->status_1_nama_file = $finalFilename;
        //             $status->status_1_path = $finalPath;
        //         }
        //         if ($isManagerCreator) {
        //             if (empty($status->submit_1_timestamps)) {
        //                 $status->submit_1_timestamps = $now;
        //             }
        //         }
        //         // if ($perusahaan && $perusahaan->hasManager()) {
        //         //     if (!empty($perusahaan->notify_1)) {
        //         //         $emailsToNotify = explode(',', $perusahaan->notify_1);
        //         //     }

        //         //     if (!empty($emailsToNotify)) {
        //         //         try {
        //         //             Mail::to($emailsToNotify)->send(new \App\Mail\CustomerSubmittedMail($customer));
        //         //         } catch (\Exception $e) {
        //         //             Log::error("Gagal kirim email lawyer (setelah manager): " . $e->getMessage());
        //         //         }
        //         //     }
        //         // }
        //         break;

        //     case 'direktur':
        //         $status->status_2_by = $userId;
        //         $status->status_2_timestamps = $now;
        //         $status->status_2_keterangan = $request->keterangan;
        //         if ($finalFilename && $finalPath) {
        //             $status->status_2_nama_file = $finalFilename;
        //             $status->status_2_path = $finalPath;
        //         }

        //         if ($isDirekturCreator) {
        //             if (empty($status->submit_1_timestamps)) {
        //                 $status->submit_1_timestamps = $now;
        //             }

        //             if (empty($status->status_1_timestamps)) {
        //                 $status->status_1_timestamps = $now;
        //                 $status->status_1_by = $userId;
        //             }
        //         }
        //         break;

        //     case 'lawyer':
        //         $status->status_3_by = $userId;
        //         $status->status_3_timestamps = $now;
        //         $status->status_3_keterangan = $request->keterangan;
        //         if ($finalFilename && $finalPath) {
        //             $status->submit_3_nama_file = $finalFilename;
        //             $status->submit_3_path = $finalPath;
        //         }

        //         if ($request->has('status_3')) {
        //             $validStatuses = ['approved', 'rejected'];
        //             $statusValue = strtolower($request->status_3);

        //             if (in_array($statusValue, $validStatuses)) {
        //                 $status->status_3 = $statusValue;
        //             }

        //             if ($statusValue === 'rejected') {
        //                 $validEmails = collect($emailsToNotify)
        //                     ->map(fn($email) => trim($email))
        //                     ->filter(fn($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
        //                     ->unique()
        //                     ->toArray();

        //                 Log::info('Akan mengirim email ke:', $validEmails);

        //                 $customer = $status->customer;

        //                 if (!empty($validEmails)) {
        //                     Mail::to($validEmails)->send(new \App\Mail\StatusRejectedMail($status, $user, $customer));
        //                 } else {
        //                     Mail::to('default@example.com')->send(new \App\Mail\StatusRejectedMail($status, $user, $customer));
        //                 }
        //             }
        //         }
        //         break;

        //     case 'auditor':
        //         $status->status_4_by = $userId;
        //         $status->status_4_timestamps = $now;
        //         $status->status_4_keterangan = $request->keterangan;
        //         if ($finalFilename && $finalPath) {
        //             $status->status_4_nama_file = $finalFilename;
        //             $status->status_4_path = $finalPath;
        //         }
        //         break;

        //     default:
        //         return back()->with('error', 'Role tidak dikenali.');
        // }

        // $status->save();

        return back()->with('success', 'Data berhasil disubmit.');
    }


    /**
     * Helper to resize image (Private)
     */
    private function resizeImage($path, $maxWidth, $quality = 75)
    {
        if (!file_exists($path)) return false;

        $info = @getimagesize($path);
        if (!$info) return false;

        $mime = $info['mime'];
        $width = $info[0];
        $height = $info[1];

        if ($width <= $maxWidth) return true;

        $newWidth = $maxWidth;
        $newHeight = floor($height * ($maxWidth / $width));

        $image = null;
        if ($mime == 'image/jpeg' || $mime == 'image/jpg') {
            $image = @imagecreatefromjpeg($path);
        } elseif ($mime == 'image/png') {
            $image = @imagecreatefrompng($path);
        }

        if (!$image) return false;

        $newImage = imagecreatetruecolor($newWidth, $newHeight);

        if ($mime == 'image/png') {
            imagealphablending($newImage, false);
            imagesavealpha($newImage, true);
        }

        imagecopyresampled($newImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        if ($mime == 'image/jpeg' || $mime == 'image/jpg') {
            imagejpeg($newImage, $path, $quality);
        } elseif ($mime == 'image/png') {
            imagepng($newImage, $path, floor($quality / 10));
        }

        imagedestroy($image);
        imagedestroy($newImage);

        return true;
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $user = auth('web')->user();

        // NEW: Fetch Internal Staff for Supervisor Assignment (Consistent with index)
        // Moved here to ensure we query the CENTRAL database (tako-user) before tenancy context is switched.
        $internalStaff = [];
        if ($user->role === 'internal') {
            $internalStaff = \App\Models\User::on('tako-user')
                ->where('role', 'internal')
                ->where('role_internal', 'staff')
                ->where('id_perusahaan', $user->id_perusahaan)
                ->select('id_user', 'name')
                ->get();
        }

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
        $spk = Spk::with(['creator','hsCodes', 'customer'])->findOrFail($id);

                // --- FIRST CLICK VALIDATION ASSIGNMENT ---
        if ($user->role === 'internal' && $user->role_internal === 'staff') {
            if (is_null($spk->validated_by)) {
                
                $notificationsToRemove = collect([]);

                DB::transaction(function () use ($spk, $user, &$notificationsToRemove) {
                    // 1. Assign Validator
                    $spk->update(['validated_by' => $user->id_user]);
                    $spk->refresh();

                    // 2. Handle Notifications
                    // A. Update Current User's Notification (Mark as Read, KEEP it)
                    \App\Models\Notification::where('id_spk', $spk->id)
                        ->where('send_to', $user->id_user)
                        ->update(['read_at' => now()]);

                    // B. Identify Notifications for OTHER staff (to be deleted)
                    $othersNotifications = \App\Models\Notification::where('id_spk', $spk->id)
                        ->where('send_to', '!=', $user->id_user)
                        ->get();
                    
                    // Capture for broadcasting after commit
                    $notificationsToRemove = $othersNotifications;

                    // C. Delete Notifications for OTHER staff
                    if ($othersNotifications->isNotEmpty()) {
                        \App\Models\Notification::whereIn('id_notification', $othersNotifications->pluck('id_notification'))
                            ->delete();
                    }
                });

                // 3. Broadcast Removal Events (AFTER COMMIT - ensuring API calls see clean DB)
                foreach ($notificationsToRemove as $notif) {
                    if ($notif->send_to) {
                        try {
                            // Helper to ensure 'id_spk' is sent in payload
                            broadcast(new \App\Events\NotificationRemoved($notif->send_to, $spk->id));
                        } catch (\Exception $e) {
                            Log::error("Failed to broadcast NotificationRemoved: " . $e->getMessage());
                        }
                    }
                }
            }
        }

        // 1. Fetch ALL statuses with Master Relation
        // 1. Fetch ALL statuses with Master Relation
        $spkStatuses = SpkStatus::with('masterStatus')->where('id_spk', $spk->id)->get();

        // 2. Determine Priority Status based on Index (Lower index = Higher Priority)
        
        // Logic: Only consider "Rejected" (ID 4) status IF there are ACTUAL active rejected documents.
        // We use fresh query and collection filtering to ensure Casts (boolean) are respected.
        $allDocs = DocumentTrans::where('id_spk', $spk->id)->get();
        
        // Check for Active Rejections (correction_attachment is TRUE)
        // FIX: Only check the LATEST version of each document type (id_dokumen).
        // Since we create new rows on re-upload, we must group by 'id_dokumen' and take the one with Max ID.
        $latestDocs = $allDocs->sortByDesc('id')->unique('id_dokumen');

        $hasActiveRejections = $latestDocs->contains(function ($doc) {
            return $doc->correction_attachment == true;
        });

        // Check for Pending Review (Uploaded but not Verified & Not Rejected)
        // verify != true captures both 'false' (0) and 'null' (Pending) safely.
        $hasPendingReview = $latestDocs->contains(function ($doc) {
            return $doc->verify != true 
                && $doc->correction_attachment == false 
                && !empty($doc->url_path_file);
        });

        // Check for Empty Documents (Not Uploaded)
        $hasEmptyDocs = $latestDocs->contains(function ($doc) {
            return empty($doc->url_path_file);
        });

        $activeStatuses = $spkStatuses->filter(function ($status) use ($hasActiveRejections, $hasPendingReview, $hasEmptyDocs) {
            $id = $status->id_status;

            // 1. Rejected (ID 4): Hide if no active rejections
            if ($id == 4 && !$hasActiveRejections) return false;

            // 2. Uploaded (ID 1) & Reuploaded (ID 3): Hide if no Pending Reviews
            if (in_array($id, [1, 3]) && !$hasPendingReview) return false;

            // 3. Requested (ID 2): Hide if no Empty Docs (Meaning all are uploaded)
            // This is CRITICAL because Requested (Index 1) overrides Verified (Index 2) if not hidden.
            if ($id == 2 && !$hasEmptyDocs) return false;

            return true;
        });

        // Sort by Index ASC (Primary), then Created At DESC (Secondary)
        $priorityStatus = $activeStatuses->sortBy([
            fn ($a, $b) => ($a->masterStatus->index ?? 999) <=> ($b->masterStatus->index ?? 999),
            fn ($a, $b) => $b->created_at <=> $a->created_at,
        ])->first();

        // 3. Format Data sesuai kebutuhan Frontend (shipmentData)
        $shipmentData = [
            'id_spk'    => $spk->id,
            // Format tanggal: 12/11/25 10.35 WIB
            'spkDate'   => $priorityStatus ? $priorityStatus->created_at->format('d/m/y H.i') . ' WIB' : '-',
            // Use SPK Status Name directly as requested
            'status'    => $priorityStatus ? $priorityStatus->status : 'UNKNOWN',
            'shipmentType' => $spk->shipment_type,
            'type'      => $spk->shipment_type,
            'spkNumber'  => $spk->spk_code, // Mapping spk_code ke siNumber
            'penjaluran' => $spk->penjaluran,
            'internal_can_upload' => $spk->internal_can_upload,
            'is_created_by_internal' => $spk->is_created_by_internal,
            'validated_by' => $spk->validated_by, // Send to frontend
        ];

        // 3. Mapping HS Code
        // Catatan: Karena struktur DB saat ini one-to-one (spk belongsTo hsCode),
        // maka array ini hanya akan berisi 1 item.
        foreach ($spk->hsCodes as $hs) {
            $shipmentData['hsCodes'][] = [
                'id'   => $hs->id_hscode,
                'code' => $hs->hs_code,
                'link' => $hs->path_link_insw,
            ];
        }

        $sectionsTrans = SectionTrans::where('id_spk', $spk->id) // <--- TAMBAHKAN INI
            ->with(['documents' => function($q) use ($spk) {
                // Filter dokumen juga (Double check agar aman)
                $q->where('id_spk', $spk->id)
                  ->orderBy('id', 'asc')
                  ->with('masterDocument'); // Load data master untuk keperluan Help/Video
            }])
            ->orderBy('section_order', 'asc')
            ->get();

        return Inertia::render('m_shipping/table/view-data-form', [
            'customer' => $spk->customer,
            'shipmentDataProp' => $shipmentData,
            'sectionsTransProp' => $sectionsTrans,
            'internalStaff' => $internalStaff, // Pass staff list
        ]);
    }

    /**
     * Assign Staff manually (Supervisor Only)
     */
    public function assignStaff(Request $request, $id)
    {
        $user = auth('web')->user();

        // 1. Authorization Check
        if ($user->role !== 'internal' || $user->role_internal !== 'supervisor') {
             abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'assigned_pic' => 'required|integer|exists:users,id_user'
        ]);

        // 2. Resolve Tenant
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } 

        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);

                // 3. Update SPK & Handle Notification (Centralized)
        // We use NotificationService that handles transaction, SPK update, and Notification Cleanup
        try {
            // Re-fetch SPK to ensure fresh state
             $spk = Spk::findOrFail($id); 

             if ($spk->validated_by == $validated['assigned_pic']) {
                return response()->json(['message' => 'User is already assigned.']);
            }
            
            $assignedUser = User::on('tako-user')->find($validated['assigned_pic']);
            
            if ($assignedUser) {
                NotificationService::handleSpkAssignment($spk, $assignedUser, $user);
            }
            
        } catch (\Exception $e) {
             Log::error("Failed to assign staff: " . $e->getMessage());
             return redirect()->back()->withErrors(['error' => 'Failed to assign staff']);
        }

        return redirect()->back()->with('success', 'Staff has been assigned successfully.');
    }

    /**
     * Helper to send batch rejection notifications
     */
    private function sendBatchRejectionNotification($spk, $sectionName, $rejector, $count, $reason)
    {
         if ($rejector->role === 'internal') {
            $customers = \App\Models\User::on('tako-user')
                ->where('id_customer', $spk->id_customer)
                ->where('role', 'eksternal')
                ->get();

            foreach ($customers as $cust) {
                 // Email
                 SectionReminderService::sendBatchDocumentRejected($spk, $sectionName, $rejector, $cust, $reason, $count);

                 // Notification
                 try {
                    NotificationService::sendBatchRejectionNotification([
                        'id_spk' => $spk->id,
                        'send_to' => $cust->id_user,
                        'created_by' => $rejector->id,
                        'role'   => 'eksternal', 
                        'section_name' => $sectionName,
                        'reason' => $reason,
                        'count' => $count,
                        'spk_code' => $spk->spk_code
                    ]);
                 } catch (\Exception $e) {}
            }
        } else {
             if ($spk->validated_by) {
                $staff = \App\Models\User::on('tako-user')->find($spk->validated_by);
                if ($staff) {
                    // Email
                    SectionReminderService::sendBatchDocumentRejected($spk, $sectionName, $rejector, $staff, $reason, $count);
                    
                    // Notification
                    try {
                        NotificationService::sendBatchRejectionNotification([
                            'id_spk' => $spk->id,
                            'send_to' => $staff->id_user,
                            'created_by' => $rejector->id,
                            'role'   => 'internal', 
                            'section_name' => $sectionName,
                            'reason' => $reason,
                            'count' => $count,
                            'spk_code' => $spk->spk_code
                        ]);
                     } catch (\Exception $e) {}
                }
            }
        }
    }

    /**
     * Helper to send batch verification notifications
     */
    private function sendBatchVerificationNotification($spk, $sectionName, $verifier, $count)
    {
        // 1. Verifier is Internal -> Notify Customer
        if ($verifier->role === 'internal') {
            $customers = \App\Models\User::on('tako-user')
                ->where('id_customer', $spk->id_customer)
                ->where('role', 'eksternal')
                ->get();

            foreach ($customers as $cust) {
                 // Email
                 try {
                     SectionReminderService::sendDocumentVerified($spk, $sectionName, $verifier, $cust);
                 } catch (\Exception $e) {}

                 // Notification
                 try {
                    NotificationService::send([
                        'id_spk' => $spk->id,
                        'send_to' => $cust->id_user,
                        'created_by' => $verifier->id,
                        'role'   => 'eksternal', 
                        'data'   => [
                            'type'    => 'document_verified',
                            'title'   => 'Dokumen Diverifikasi',
                            'message' => "{$count} dokumen pada section {$sectionName} telah diverifikasi oleh {$verifier->name}.",
                            'url'     => "/shipping/{$spk->id}",
                            'spk_code'=> $spk->spk_code,
                        ]
                    ]);
                 } catch (\Exception $e) {}
            }
        } 
        // 2. Verifier is External -> Notify Staff
        else {
            if ($spk->validated_by) {
                $staff = \App\Models\User::on('tako-user')->find($spk->validated_by);
                if ($staff) {
                    // Email
                    try {
                        SectionReminderService::sendDocumentVerified($spk, $sectionName, $verifier, $staff);
                    } catch (\Exception $e) {}
                    
                    // Notification
                    try {
                        NotificationService::send([
                            'id_spk' => $spk->id,
                            'send_to' => $staff->id_user,
                            'created_by' => $verifier->id,
                            'role'   => 'internal', 
                            'data'   => [
                                'type'    => 'document_verified',
                                'title'   => 'Dokumen Diverifikasi',
                                'message' => "{$count} dokumen pada section {$sectionName} telah diverifikasi oleh Customer {$verifier->name}.",
                                'url'     => "/shipping/{$spk->id}",
                                'spk_code'=> $spk->spk_code,
                            ]
                        ]);
                     } catch (\Exception $e) {}
                }
            }
        }
    }

    /**
     * Helper to send batch upload notifications
     */
    private function sendBatchUploadNotification($spk, $sectionName, $uploader, $count)
    {
        // A. Internal Uploader -> Notify Customer
        if ($uploader->role === 'internal') {
            $customers = \App\Models\User::on('tako-user')
                ->where('id_customer', $spk->id_customer)
                ->where('role', 'eksternal') // Or matching logic
                ->get();
            
            foreach ($customers as $cust) {
                // Email using Service
                SectionReminderService::sendDocumentUploaded($spk, $sectionName, $uploader, $cust);

                // Notification
                try {
                    NotificationService::send([
                        'send_to' => $cust->id_user,
                        'created_by' => $uploader->id,
                        'role' => 'eksternal',
                        'id_spk' => $spk->id,
                        'data' => [
                            'type' => 'document_uploaded',
                            'title' => 'Dokumen Baru Diupload',
                            'message' => "Staff {$uploader->name} mengupload {$count} dokumen pada section {$sectionName}.",
                            'url' => "/shipping/{$spk->id}",
                            'spk_code' => $spk->spk_code
                        ]
                    ]);
                } catch (\Exception $e) {}
            }
        } 
        // B. Customer Uploader -> Notify Staff
        else {
            if ($spk->validated_by) {
                $staff = \App\Models\User::on('tako-user')->find($spk->validated_by);
                if ($staff) {
                    // Email using Service
                    SectionReminderService::sendDocumentUploaded($spk, $sectionName, $uploader, $staff);

                    try {
                        NotificationService::send([
                            'send_to' => $staff->id_user,
                            'created_by' => $uploader->id,
                            'role' => 'internal',
                            'id_spk' => $spk->id,
                            'data' => [
                                'type' => 'document_uploaded',
                                'title' => 'Dokumen Baru Diupload',
                                'message' => "Customer {$uploader->name} mengupload {$count} dokumen pada section {$sectionName}.",
                                'url' => "/shipping/{$spk->id}",
                                'spk_code' => $spk->spk_code
                            ]
                        ]);
                    } catch (\Exception $e) {}
                }
            }
            
        }
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


    /**
     * Get available documents from master_documents_trans where id_section is null or 0
     * These are documents that haven't been assigned to any section yet
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAvailableDocuments(Request $request)
    {
        $user = auth('web')->user();

        // Initialize tenant context FIRST
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant not found'
            ], 404);
        }

        tenancy()->initialize($tenant);
        
        // Validate AFTER tenant is initialized
        $request->validate([
            'id_spk' => 'required|integer|exists:spk,id',
        ]);

        try {
            // Get documents where id_section is null or 0 (unassigned documents)
            $availableDocuments = MasterDocumentTrans::whereNull('id_section')
                ->orWhere('id_section', 0)
                ->select([
                    'id_dokumen',
                    'nama_file',
                    'description_file',
                    'is_internal',
                    'is_verification',
                    'attribute',
                    'link_path_example_file',
                    'link_path_template_file',
                    'link_url_video_file'
                ])
                ->orderBy('nama_file', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'documents' => $availableDocuments
            ]);

        } catch (\Throwable $e) {
            Log::error('Failed to fetch available documents', [
                'error' => $e->getMessage(),
                'user_id' => $user->id_user,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch documents: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add multiple documents to a section (Batch)
     */
    public function addDocumentsToSection(Request $request)
    {
        $user = auth('web')->user();

        // 1. Initialize Tenant Context
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }
        
        if (!$tenant) return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        tenancy()->initialize($tenant);

        $request->validate([
            'id_spk' => 'required|integer',
            'id_section' => 'required|integer',
            'document_ids' => 'required|array',
            'document_ids.*' => 'integer|exists:master_documents_trans,id'
        ]);

        try {
            DB::beginTransaction();

            $spkId = $request->id_spk;
            $sectionId = $request->id_section;
            $documentIds = $request->document_ids;

            $addedCount = 0;
            foreach ($documentIds as $masterDocTransId) {
                // Get master doc trans info
                $masterDocTrans = MasterDocumentTrans::find($masterDocTransId);
                
                if ($masterDocTrans) {
                    // Check if already exists in this SPK to prevent duplicates
                    // BUG FIX: Compare id_dokumen (The Master Document Type) instead of ID record.
                    $exists = DocumentTrans::where('id_spk', $spkId)
                        ->where('id_dokumen', $masterDocTrans->id_dokumen)
                        ->exists();

                    if (!$exists) {
                        DocumentTrans::create([
                            'id_spk' => $spkId,
                            'id_section' => $sectionId,
                            'id_dokumen' => $masterDocTrans->id_dokumen,
                            'nama_file' => null,
                            'url_path_file' => null,
                            'verify' => null,
                            'correction_attachment' => false,
                            'kuota_revisi' => 3, // Default quota
                            'is_internal' => $masterDocTrans->is_internal,
                            'is_verification' => $masterDocTrans->is_verification,
                            'mapping_insw' => $masterDocTrans->mapping_insw,
                        ]);
                        $addedCount++;
                    }
                }
            }

            DB::commit();

            if ($addedCount > 0) {
                 try {
                    ShippingDataUpdated::dispatch($spkId, 'add_document');
                } catch (\Exception $e) {}
            }

            return response()->json([
                'success' => true,
                'message' => "Successfully added {$addedCount} documents to section."
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to add documents: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unified Batch Save: Upload, Verify, Reject, and Deadline in one request.
     */
    public function unifiedBatchSave(Request $request)
    {
        $user = auth('web')->user();
        $userId = $user->id_user ?? $user->id;

        $request->validate([
            'spk_id' => 'required',
            'section_id' => 'required',
            'section_name' => 'nullable|string',
            'attachments' => 'nullable|array',
            'verified_ids' => 'nullable|array',
            'rejections' => 'nullable|array',
            'deadline' => 'nullable|string',
        ]);

        $spkId = $request->spk_id;
        $sectionId = $request->section_id;
        $sectionName = $request->section_name ?? 'Document';

        // 1. Initialize Tenancy
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = \App\Models\Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }
        if (!$tenant) {
            if ($request->header('X-Inertia')) {
                return back()->withErrors(['message' => 'Tenant not found']);
            }
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }
        tenancy()->initialize($tenant);
        $tenantConnection = 'tenant';

        $spk = Spk::findOrFail($spkId);
        $metrics = ['uploads' => 0, 'verifications' => 0, 'rejections' => 0, 'deadline' => false];

        DB::beginTransaction();
        try {
            // --- A. PROCESS ATTACHMENTS ---
            if ($request->has('attachments') && is_array($request->attachments)) {
                $uniqueSections = [];
                $hasAnyReupload = false;
                
                foreach ($request->attachments as $att) {
                    $tempPath = $att['path'];
                    if (!Storage::disk('customers_external')->exists($tempPath)) {
                        $tempPath = ltrim($tempPath, '/');
                        if (!Storage::disk('customers_external')->exists($tempPath)) continue;
                    }

                    $targetDoc = DocumentTrans::on($tenantConnection)->with('sectionTrans')->find($att['document_id']);
                    if (!$targetDoc) continue;

                    if ($targetDoc->sectionTrans) {
                        $uniqueSections[$targetDoc->sectionTrans->id] = $targetDoc->sectionTrans->section_name;
                    }

                    // Re-upload logic: only replicate if it already has a file OR is marked as correction.
                    // IMPORTANT: If url_path_file is empty, we just update the existing record to avoid "empty v1" duplicates.
                    $isReupload = ($targetDoc->correction_attachment && !empty($targetDoc->url_path_file)) || !empty($targetDoc->url_path_file);
                    if ($isReupload) $hasAnyReupload = true;

                    // Processing
                    $fileContent = Storage::disk('customers_external')->get($tempPath);
                    $ext = strtolower(pathinfo($tempPath, PATHINFO_EXTENSION));
                    $shippingFolder = "shipping/" . date('Y/m') . "/{$spk->spk_code}";
                    
                    if (!Storage::disk('customers_external')->exists($shippingFolder)) Storage::disk('customers_external')->makeDirectory($shippingFolder);

                    $cleanFileName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $att['type']);
                    $finalRelPath = "{$shippingFolder}/{$cleanFileName}_" . uniqid() . ".{$ext}";
                    $absPath = Storage::disk('customers_external')->path($finalRelPath);

                    Storage::disk('customers_external')->put($finalRelPath, $fileContent);

                    // Optimized GS -> Now Asynchronous via Job
                    if ($ext === 'pdf' && filesize($absPath) > 2 * 1024 * 1024) {
                        GhostscriptCompressionJob::dispatch($absPath, $finalRelPath);
                    } elseif (in_array($ext, ['jpg', 'jpeg', 'png'])) {
                        $this->resizeImage($absPath, 800, 75);
                    }

                    Storage::disk('customers_external')->delete($tempPath);

                    if ($isReupload) {
                        $newDoc = $targetDoc->replicate();
                        $newDoc->url_path_file = $finalRelPath;
                        $newDoc->verify = ($spk->internal_can_upload || ($targetDoc->is_verification === false)) ? true : null;
                        $newDoc->correction_attachment = false;
                        $newDoc->kuota_revisi = max(0, $targetDoc->kuota_revisi - 1);
                        $newDoc->save();
                        $logId = $newDoc->id;
                    } else {
                        $targetDoc->update([
                            'url_path_file' => $finalRelPath,
                            'verify' => ($spk->internal_can_upload || ($targetDoc->is_verification === false)) ? true : null,
                            'correction_attachment' => false,
                            'kuota_revisi' => max(0, $targetDoc->kuota_revisi - 1),
                        ]);
                        $logId = $targetDoc->id;
                    }

                    DocumentStatus::on($tenantConnection)->create(['id_dokumen_trans' => $logId, 'status' => 'Uploaded', 'by' => $user->name]);
                    $metrics['uploads']++;
                }

                if ($metrics['uploads'] > 0) {
                    $notifSec = count($uniqueSections) > 0 ? implode(' dan ', $uniqueSections) : $sectionName;
                    $this->sendBatchUploadNotification($spk, $notifSec, $user, $metrics['uploads']);
                    
                    // Update Status
                    $statusId = $hasAnyReupload ? 3 : 1;
                    $statusTxt = "{$notifSec} " . ($hasAnyReupload ? 'Reuploaded' : 'Uploaded');
                    SpkStatus::create(['id_spk' => $spk->id, 'id_status' => $statusId, 'status' => $statusTxt]);
                }
            }

            // --- B. VERIFICATIONS ---
            if ($request->has('verified_ids') && is_array($request->verified_ids)) {
                $ids = $request->verified_ids;
                DocumentTrans::on($tenantConnection)->whereIn('id', $ids)->update(['verify' => true, 'correction_attachment' => false, 'updated_at' => now()]);
                foreach ($ids as $id) {
                    DocumentStatus::on($tenantConnection)->create(['id_dokumen_trans' => $id, 'status' => 'Verified', 'by' => $user->name]);
                }
                SpkStatus::create(['id_spk' => $spk->id, 'id_status' => 2, 'status' => "{$sectionName} Verified"]);
                $this->sendBatchVerificationNotification($spk, $sectionName, $user, count($ids));
                $metrics['verifications'] = count($ids);
            }

            // --- C. REJECTIONS ---
            if ($request->has('rejections') && is_array($request->rejections)) {
                $rejSecs = [];
                foreach ($request->rejections as $index => $rej) {
                    $doc = DocumentTrans::on($tenantConnection)->with('sectionTrans')->findOrFail($rej['doc_id']);
                    if ($doc->sectionTrans) $rejSecs[$doc->sectionTrans->id] = $doc->sectionTrans->section_name;
                    
                    $rejPath = $doc->correction_attachment_file;
                    $file = $request->file("rejections.$index.file");
                    if ($file) $rejPath = $file->store('corrections', 'customers_external');

                    $doc->update(['verify' => false, 'correction_attachment' => true, 'correction_description' => $rej['note'], 'correction_attachment_file' => $rejPath]);
                    DocumentStatus::on($tenantConnection)->create(['id_dokumen_trans' => $doc->id, 'status' => 'Rejected', 'by' => $user->name]);
                    $metrics['rejections']++;
                }
                if ($metrics['rejections'] > 0) {
                    $rejSecName = implode(' dan ', $rejSecs);
                    SpkStatus::create(['id_spk' => $spk->id, 'id_status' => 4, 'status' => "{$rejSecName} Rejected"]);
                    $this->sendBatchRejectionNotification($spk, $rejSecName, $user, $metrics['rejections'], $request->rejections[0]['note']);
                }
            }

            // --- D. DEADLINE ---
            if ($request->deadline) {
                $st = SectionTrans::on($tenantConnection)->where(['id_spk' => $spk->id, 'id_section' => $sectionId])->first();
                if ($st) {
                    $st->update(['deadline' => $request->deadline]);
                    $metrics['deadline'] = true;
                }
            }

            DB::commit();
            
            try {
                broadcast(new ShippingDataUpdated($spk->id, 'unified_save'))->toOthers();
            } catch (\Exception $e) {
                Log::error('Realtime update failed: ' . $e->getMessage());
            }

            if ($request->header('X-Inertia')) {
                return back();
            }

            return response()->json(['success' => true, 'metrics' => $metrics]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Unified Save Fail: " . $e->getMessage());

            if ($request->header('X-Inertia')) {
                return back()->withErrors(['message' => $e->getMessage()]);
            }

            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update penjaluran (jalur merah/biru) for SPK
     */
    public function updatePenjaluran(Request $request)
    {
        $user = auth('web')->user();

        // Initialize tenant context FIRST
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);
        
        $validated = $request->validate([
            'id_spk' => 'required|integer|exists:spk,id',
            'penjaluran' => 'required|string|in:merah,biru',
        ]);

        try {
            $spk = Spk::findOrFail($validated['id_spk']);
            $spk->update(['penjaluran' => $validated['penjaluran']]);

            Log::info('Penjaluran updated', ['spk_id' => $spk->id, 'penjaluran' => $validated['penjaluran']]);

            try {
                ShippingDataUpdated::dispatch($spk->id, 'penjaluran_update');
            } catch (\Exception $e) {
                Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return response()->json(['success' => true, 'message' => 'Penjaluran updated', 'penjaluran' => $validated['penjaluran']]);
        } catch (\Throwable $e) {
            Log::error('Failed to update penjaluran: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to update penjaluran'], 500);
        }
    }

}
