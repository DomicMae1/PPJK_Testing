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
use Illuminate\Support\Facades\Auth; // Ensure Auth is used

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

    public function processAttachment(Request $request)
    {
        // Initialize Tenant Context FIRST
        $user = Auth::user();
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }
        
        if ($tenant) {
            tenancy()->initialize($tenant);
        }

        // 1. Validasi Input
        $request->validate([
            'path'        => 'required|string', // Path temp dari response upload
            'spk_code'    => 'required|string', // Kunci utama penamaan
            'type'        => 'required|string', // Jenis dokumen (filename base)
            'mode'        => 'nullable|string', // Mode kompresi
            'document_id' => 'nullable|integer', // ID Dokumen Trans (Optional, required for DB update)
            'section_name'=> 'nullable|string', // Nama Section untuk folder
        ]);

        // Ambil Data Request
        $tempPath = $request->path;
        $spkCode  = $request->spk_code;
        $type     = strtolower($request->type);
        $mode     = $request->mode ?? 'medium';
        $docId    = $request->document_id;
        $sectionName = $request->section_name ? Str::slug($request->section_name) : 'general';
        
        // Cek SPK untuk internal_can_upload (Perlu query SPK dulu karena tidak dikirim request)
        // Kita bisa ambil dari $spkCode tapi itu string code, bukan ID. 
        // Lebih aman query SPK by code atau jika docId ada, ambil relation.
        $isInternalCanUpload = false;
        if ($docId) {
             $spkInfo = DocumentTrans::with('spk')->find($docId);
             if ($spkInfo && $spkInfo->spk) {
                 $isInternalCanUpload = $spkInfo->spk->internal_can_upload;
             }
        }

        // 2. Setup Disk
        $disk = Storage::disk('customers_external');

        // Cek keberadaan file temp
        if (!$disk->exists($tempPath)) {
            return response()->json(['error' => 'File temp tidak ditemukan'], 404);
        }

        // =========================================================
        // A. TENTUKAN FOLDER TUJUAN & NAMA FILE
        // =========================================================

        // Folder tujuan: documents/{spk_code}/{section_name}
        $targetDir = "documents/{$spkCode}/{$sectionName}";

        // Buat folder jika belum ada
        if (!$disk->exists($targetDir)) {
            $disk->makeDirectory($targetDir);
        }

        // Ambil ekstensi
        $ext = pathinfo($tempPath, PATHINFO_EXTENSION);

        // Generate Nama File dengan Version Logic
        // First upload: {type}.{ext}
        // Re-upload: v{N}-{type}.{ext}
        
        // Generate Nama File dengan Version Logic
        // First upload: {type}.{ext}
        // Re-upload: v{N}-{type}.{ext}
        
        $cleanType = $type;
        $versionNumber = 1;
        $isFirstUpload = true;
        $targetDoc = null;
        $isReupload = false;

        if ($docId) {
            $existingDoc = DocumentTrans::find($docId);
            if ($existingDoc) {
                // Determine clean base name from Master Document
                if ($existingDoc->masterDocument) {
                    $cleanType = $existingDoc->masterDocument->nama_file;
                }

                $isReupload = !empty($existingDoc->url_path_file);

                // Count existing uploaded files for this document type (Master ID + SPK ID)
                // This includes the current one if it's already uploaded
                $uploadCount = DocumentTrans::where('id_spk', $existingDoc->id_spk)
                    ->where('id_dokumen', $existingDoc->id_dokumen)
                    ->where('id_section', $existingDoc->id_section)
                    ->whereNotNull('url_path_file')
                    ->count();

                if ($isReupload) {
                    $versionNumber = $uploadCount + 1;
                    $isFirstUpload = false;
                } else {
                    // Filling a placeholder
                    $versionNumber = ($uploadCount > 0) ? $uploadCount + 1 : 1;
                    $isFirstUpload = ($versionNumber === 1);
                }
            }
        }

        $typeSlug = Str::slug($cleanType);
        
        // Generate filename
        if ($isFirstUpload) {
            $newFileName = "{$typeSlug}.{$ext}";
        } else {
            $newFileName = "v{$versionNumber}-{$typeSlug}.{$ext}";
        }
        
        // Path Tujuan Akhir
        $finalRelPath = "{$targetDir}/{$newFileName}";

        // =========================================================
        // B. PROSES KOMPRESI (GHOSTSCRIPT) & PEMINDAHAN
        // =========================================================

        $success = false;

        // Cek apakah file PDF
        if (strtolower($ext) === 'pdf') {
            $localInputName  = 'gs_in_' . uniqid() . '.pdf';
            $localOutputName = 'gs_out_' . uniqid() . '.pdf';

            // Simpan ke local for processing
            Storage::disk('local')->put("gs_processing/{$localInputName}", $disk->get($tempPath));

            $localInputPath  = Storage::disk('local')->path("gs_processing/{$localInputName}");
            $localOutputPath = Storage::disk('local')->path("gs_processing/{$localOutputName}");

            // Jalankan Ghostscript
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

        // Finalisasi Move/Delete Temp
        if (!$success) {
            $disk->move($tempPath, $finalRelPath);
        } else {
            if ($disk->exists($tempPath)) $disk->delete($tempPath);
        }

        // =========================================================
        // C. UPDATE DATABASE & LOGGING
        // =========================================================
        if ($docId && isset($existingDoc)) {
            
            // Calculate New Quota (Always Decrement on Upload)
            // User requested to use 'kuota_revisi'.
            $currentQuota = $existingDoc->kuota_revisi;
            $newQuota = ($currentQuota > 0) ? $currentQuota - 1 : 0;

            if ($isReupload) {
                // --- CREATE NEW ROW FOR RE-UPLOAD (HISTORY) ---
                
                // Create new instance
                $targetDoc = DocumentTrans::create([
                    'id_spk'                     => $existingDoc->id_spk,
                    'id_dokumen'                 => $existingDoc->id_dokumen,
                    'id_section'                 => $existingDoc->id_section,
                    'nama_file'                  => $newFileName,
                    'url_path_file'              => $finalRelPath,
                    'is_internal'                => $existingDoc->is_internal, // Copy from existing
                    'verify'                     => $isInternalCanUpload ? true : null, // Reset status OR auto-verify
                    'correction_attachment'      => false,
                    'correction_attachment_file' => null,
                    'correction_description'     => null,
                    'kuota_revisi'               => $newQuota, // Update kuota_revisi
                    'mapping_insw'               => $existingDoc->mapping_insw,
                    'created_at'                 => now(),
                    'updated_at'                 => now(),
                ]);

            } else {
                // --- UPDATE EXISTING PLACEHOLDER ---
                $targetDoc = $existingDoc;
                $targetDoc->update([
                    'url_path_file' => $finalRelPath,
                    'nama_file'     => $newFileName,
                    // 'upload_by'     => null, // Removed
                    'verify'        => $isInternalCanUpload ? true : null, // Reset or auto-verify
                    'correction_attachment' => false,
                    'kuota_revisi'  => $newQuota, // Update kuota_revisi here too
                    'updated_at'    => now(),
                ]);
            }

            // Log Status
            if ($targetDoc) {
                DocumentStatus::create([
                    'id_dokumen_trans' => $targetDoc->id,
                    'status'           => 'Uploaded',
                    'by'               => Auth::user()->name ?? 'Unknown',
                ]);

                // REALTIME UPDATE
                try {
                    ShippingDataUpdated::dispatch($targetDoc->id_spk, 'upload');
                } catch (\Exception $e) {
                    Log::error('Realtime update failed: ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'status'     => 'success',
            'final_path' => $finalRelPath,
            'nama_file'  => $newFileName,
            'compressed' => $success
        ]);
    }

    /**
     * Verify Document (Internal)
     */
    public function verifyDocument(Request $request, $id)
    {
        // Initialize Tenant Context
        $user = Auth::user();
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }
        
        if ($tenant) {
            tenancy()->initialize($tenant);
        }


        try {
            $document = DocumentTrans::findOrFail($id);
            
            $document->update([
                'verify' => true,
                'correction_attachment' => false,
                // 'correction_description' => null, // Optional: Clear reject history? or keep? User didn't specify. Keep history usually good.
            ]);

            DocumentStatus::create([
                'id_dokumen_trans' => $document->id,
                'status'           => 'Verified',
                'by'               => Auth::user() ? Auth::user()->name : 'System',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document verified successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Verification error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            \Log::error('Current DB connection: ' . config('database.default'));
            \Log::error('Auth user: ' . (Auth::user() ? Auth::user()->email : 'none'));
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify document: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Batch Verify Documents (Internal)
     */
    public function batchVerifyDocuments(Request $request)
    {
        // Initialize Tenant Context
        $user = Auth::user();
        
        // --- 1. Initialize Tenant Context ---
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }
        
        if ($tenant) {
            tenancy()->initialize($tenant);
        }

        $request->validate([
            'spk_id' => 'required|integer',
            'section_id' => 'nullable|integer', // Optional, for context in notification
            'verified_ids' => 'required|array',
            'verified_ids.*' => 'integer|exists:document_trans,id',
        ]);

        try {
            DB::beginTransaction();

            $verifiedIds = $request->input('verified_ids');
            $spkId = $request->input('spk_id');
            $sectionId = $request->input('section_id');

            $uniqueSections = [];
            $lastSectionName = '';

            // 1. Update Documents
            foreach ($verifiedIds as $docId) {
                $document = DocumentTrans::with('sectionTrans')->find($docId);
                if ($document) {
                    $document->update([
                        'verify' => true,
                        'correction_attachment' => false,
                        'updated_at' => now(),
                    ]);

                    DocumentStatus::create([
                        'id_dokumen_trans' => $document->id,
                        'status'           => 'Verified',
                        'by'               => Auth::user() ? Auth::user()->name : 'System',
                    ]);

                    // Collect Section
                     if ($document->sectionTrans) {
                        $uniqueSections[$document->sectionTrans->id] = $document->sectionTrans->section_name;
                        $lastSectionName = $document->sectionTrans->section_name;
                    }
                }
            }

            // 2. Post-Processing (Status & Notification)
            if (count($verifiedIds) > 0) {
                $spk = Spk::find($spkId);
                
                // Determine Consolidated Section Name
                $notificationSectionName = $lastSectionName;
                if (count($uniqueSections) > 0) {
                    $notificationSectionName = implode(' dan ', $uniqueSections); 
                }

                // Update SPK Status
                SpkStatus::create([
                    'id_spk' => $spkId,
                    'id_status' => 5, // Verified (Master ID 5)
                    'status' => "{$lastSectionName} Verified",
                ]);

                // CHECK FOR COMPLETION (If ALL docs are verified)
                // verify != true includes: null (pending), false (rejected), 0 (rejected)
                $hasUnverifiedDocs = DocumentTrans::where('id_spk', $spkId)
                    ->where(function($query) {
                        $query->where('verify', '!=', true)
                              ->orWhereNull('verify');
                    })
                    ->exists();

                if (!$hasUnverifiedDocs) {
                    SpkStatus::create([
                        'id_spk' => $spkId,
                        'id_status' => 7, // Completed (Master ID 7)
                        'status' => 'Completed',
                    ]);
                }

                $verifier = Auth::user();
                $count = count($verifiedIds);

                // BIDIRECTIONAL LOGIC
                // A. Verifier is Internal -> Notify Customer
                if ($verifier->role === 'internal') {
                    $customers = \App\Models\User::on('tako-user')
                        ->where('id_customer', $spk->id_customer)
                        ->where('role', 'eksternal')
                        ->get();

                    foreach ($customers as $cust) {
                         // Email
                         SectionReminderService::sendDocumentVerified($spk, $notificationSectionName, $verifier, $cust);

                         // Notification
                         try {
                            NotificationService::send([
                                'id_spk' => $spkId,
                                'send_to' => $cust->id_user,
                                'created_by' => $verifier->id,
                                'role'   => 'eksternal', 
                                'data'   => [
                                    'type'    => 'document_verified',
                                    'title'   => 'Dokumen Diverifikasi',
                                    'message' => "{$count} dokumen pada section {$notificationSectionName} telah diverifikasi oleh {$verifier->name}.",
                                    'url'     => "/shipping/{$spkId}",
                                    'spk_code'=> $spk->spk_code,
                                ]
                            ]);
                         } catch (\Exception $e) {}
                    }
                } 
                // B. Verifier is External -> Notify Staff
                else {
                    if ($spk->validated_by) {
                        $staff = \App\Models\User::on('tako-user')->find($spk->validated_by);
                        if ($staff) {
                            // Email
                            SectionReminderService::sendDocumentVerified($spk, $notificationSectionName, $verifier, $staff);
                            
                            // Notification
                            try {
                                NotificationService::send([
                                    'id_spk' => $spkId,
                                    'send_to' => $staff->id_user, // Staff User ID
                                    'created_by' => $verifier->id,
                                    'role'   => 'internal', 
                                    'data'   => [
                                        'type'    => 'document_verified',
                                        'title'   => 'Dokumen Diverifikasi',
                                        'message' => "{$count} dokumen pada section {$notificationSectionName} telah diverifikasi oleh Customer {$verifier->name}.",
                                        'url'     => "/shipping/{$spkId}",
                                        'spk_code'=> $spk->spk_code,
                                    ]
                                ]);
                             } catch (\Exception $e) {}
                        }
                    }
                }

                 // REALTIME UPDATE
                 try {
                    ShippingDataUpdated::dispatch($spkId, 'batch_verify');
                } catch (\Exception $e) {
                    Log::error('Realtime update failed: ' . $e->getMessage());
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($verifiedIds) . ' documents verified successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Batch Verification error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify documents: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject Document (Internal)
     */
    public function rejectDocument(Request $request, $id)
    {
        // Initialize Tenant Context
        $user = Auth::user();
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }
        
        if ($tenant) {
            tenancy()->initialize($tenant);
        }


        try {
            DB::beginTransaction();

            $request->validate([
                'correction_description' => 'required|string',
                'correction_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            ]);

            // Get current tenant connection
            $tenantConnection = tenancy()->tenant ? 'tenant' : config('database.default');
            
            $document = DocumentTrans::on($tenantConnection)->with(['spk', 'sectionTrans'])->findOrFail($id);
            $spk = $document->spk;
            
            $correctionFilePath = $document->correction_attachment_file;
            $correctionPath = null; // Initialize correctionPath

            // Handle Correction File Upload
            if ($request->hasFile('correction_file')) {
                $file = $request->file('correction_file');
                // Store in specific folder
                $path = $file->store('corrections', 'customers_external'); 
                $correctionFilePath = $path;
                $correctionPath = $path; // Set correctionPath for response
            }

            $document->update([
                'verify' => false, // Rejected
                'correction_attachment' => true,
                'correction_description' => $request->correction_description,
                'correction_attachment_file' => $correctionFilePath,
                // Quota reduction moved to upload only
            ]);

            DocumentStatus::on($tenantConnection)->create([
                'id_dokumen_trans' => $document->id,
                'status'           => 'Rejected',
                'by'               => Auth::user() ? Auth::user()->name : 'System',
            ]);


            // SPK Status Update
            $docName = $document->nama_file ?? 'Document';
            SpkStatus::create([
                'id_spk' => $spk->id,
                'id_status' => 4, // Rejected (Master ID 4)
                'status' => "{$docName} Rejected",
            ]);

            // Notification & Email
            $sectionName = $document->sectionTrans ? $document->sectionTrans->section_name : 'Document';
            $rejector = Auth::user();
            $reason = $request->correction_description;

             // BIDIRECTIONAL LOGIC
             if ($rejector->role === 'internal') {
                $customers = \App\Models\User::on('tako-user')
                    ->where('id_customer', $spk->id_customer)
                    ->where('role', 'eksternal')
                    ->get();

                foreach ($customers as $cust) {
                     // Email
                     SectionReminderService::sendDocumentRejected($spk, $sectionName, $rejector, $cust, $reason, $docName);

                     // Notification
                     try {
                        NotificationService::send([
                            'id_spk' => $spk->id,
                            'send_to' => $cust->id_user,
                            'created_by' => $rejector->id,
                            'role'   => 'eksternal', 
                            'data'   => [
                                'type'    => 'document_rejected',
                                'title'   => 'Dokumen Ditolak',
                                'message' => "Dokumen {$docName} pada section {$sectionName} ditolak. Alasan: {$reason}.",
                                'url'     => "/shipping/{$spk->id}",
                                'spk_code'=> $spk->spk_code,
                            ]
                        ]);
                     } catch (\Exception $e) {}
                }
            } else {
                if ($spk->validated_by) {
                    $staff = \App\Models\User::on('tako-user')->find($spk->validated_by);
                    if ($staff) {
                        // Email
                        SectionReminderService::sendDocumentRejected($spk, $sectionName, $rejector, $staff, $reason, $docName);
                        
                        // Notification
                        try {
                            NotificationService::send([
                                'id_spk' => $spk->id,
                                'send_to' => $staff->id_user,
                                'created_by' => $rejector->id,
                                'role'   => 'internal', 
                                'data'   => [
                                    'type'    => 'document_rejected',
                                    'title'   => 'Dokumen Ditolak',
                                    'message' => "Dokumen {$docName} pada section {$sectionName} ditolak oleh Customer. Alasan: {$reason}.",
                                    'url'     => "/shipping/{$spk->id}",
                                    'spk_code'=> $spk->spk_code,
                                ]
                            ]);
                         } catch (\Exception $e) {}
                    }
                }
            }

            DB::commit(); // Commit Transaction

             // REALTIME UPDATE
             try {
                ShippingDataUpdated::dispatch($document->id_spk, 'reject'); // Use $document->id_spk
            } catch (\Exception $e) {
                Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Document rejected successfully',
                'file_path' => $correctionPath
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Rejection error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject document: ' . $e->getMessage()
            ], 500);
        }
    }

    // Helper Ghostscript (Private)
    private function runGhostscript($inputPath, $outputPath, $mode)
    {
        $settings = [
            'small'  => ['-dPDFSETTINGS=/screen', '-dColorImageResolution=150', '-dGrayImageResolution=150', '-dMonoImageResolution=150'], // Ubah /ebook ke /screen untuk kompresi maksimal (optional)
            'medium' => ['-dPDFSETTINGS=/ebook', '-dColorImageResolution=200', '-dGrayImageResolution=200', '-dMonoImageResolution=200'],
            'high'   => ['-dPDFSETTINGS=/printer', '-dColorImageResolution=300', '-dGrayImageResolution=300', '-dMonoImageResolution=300'],
        ];
        $config = $settings[$mode] ?? $settings['medium'];

        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $gsExe = $isWindows ? 'C:\Program Files\gs\gs10.05.1\bin\gswin64c.exe' : '/usr/bin/gs';

        if ($isWindows && !file_exists($gsExe)) {
            Log::error("Ghostscript executable not found at: " . $gsExe);
            return false;
        }

        $inputPath  = str_replace('\\', '/', $inputPath);
        $outputPath = str_replace('\\', '/', $outputPath);

        // 2. PERBAIKAN URUTAN COMMAND
        // Urutan yang benar: [Executable] -> [Basic Flags] -> [Compression Config] -> [Output] -> [Input]
        $cmd = array_merge(
            [$gsExe],
            [
                '-q',
                '-dNOPAUSE',    // Tambahan penting untuk Windows
                '-dBATCH',      // Tambahan penting untuk Windows
                '-dSAFER',
                '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4'
            ],
            $config, // <--- MASUKKAN CONFIG DI SINI (SEBELUM OUTPUT)
            [
                '-sOutputFile=' . $outputPath, // Gunakan sintaks -sOutputFile= untuk keamanan path Windows
                $inputPath
            ]
        );

        try {
            $process = new Process($cmd);
            
            // --- PERBAIKAN DISINI: SET ENV VARIABLES UNTUK WINDOWS ---
            if ($isWindows) {
                // Ghostscript butuh folder TEMP yang valid
                // Kita gunakan sys_get_temp_dir() dari PHP
                $tempDir = sys_get_temp_dir();
                
                $process->setEnv([
                    'TEMP' => $tempDir,
                    'TMP'  => $tempDir,
                    // Opsional: Jika masih gagal, tambahkan SystemRoot
                    'SystemRoot' => getenv('SystemRoot') ?: 'C:\Windows',
                ]);
            }
            // ---------------------------------------------------------

            $process->setTimeout(300);
            $process->run();

            // ... (Sisa kode validasi dan logging sama) ...
            if (!$process->isSuccessful()) {
                Log::error('GS Gagal (Exit Code: ' . $process->getExitCode() . ')');
                Log::error('GS Command: ' . $process->getCommandLine());
                Log::error('GS Output: ' . $process->getOutput());
                Log::error('GS Error Output: ' . $process->getErrorOutput());
                return false;
            }

            if (file_exists($outputPath) && filesize($outputPath) > 0) {
                return true;
            } 
            
            Log::warning("GS finished successfully but output file is missing/empty.");
            return false;

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
        $hasActiveRejections = $allDocs->contains(function ($doc) {
            return $doc->correction_attachment == true;
        });

        // Check for Pending Review (Uploaded but not Verified & Not Rejected)
        // verify != true captures both 'false' (0) and 'null' (Pending) safely.
        $hasPendingReview = $allDocs->contains(function ($doc) {
            return $doc->verify != true 
                && $doc->correction_attachment == false 
                && !empty($doc->url_path_file);
        });

        // Check for Empty Documents (Not Uploaded)
        $hasEmptyDocs = $allDocs->contains(function ($doc) {
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
            'internal_can_upload' => $spk->internal_can_upload,
            'hsCodes'   => [],
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
        ]);
    }

    /**
     * Batch Process Attachments (Optimized)
     * Handles multiple file processing in single transaction + Notification.
     */
    
    public function batchProcessAttachments(Request $request)
    {
        $user = auth('web')->user();
        
        $request->validate([
            'spk_id' => 'required',
            'attachments' => 'required|array',
            'attachments.*.path' => 'required|string',
            'attachments.*.document_id' => 'required',
            'attachments.*.type' => 'required|string',
            'section_name' => 'nullable|string',
        ]);

        $spkId = $request->spk_id;
        $attachments = $request->attachments;
        $sectionName = $request->section_name ?? 'Document';

        // 1. Initialize Tenancy
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) return response()->json(['message' => 'Tenant not found'], 404);
        tenancy()->initialize($tenant);

        // Limit execution time for batch process
        set_time_limit(300); 

        Log::info("Batch Process Payload:", ['attachments' => $attachments, 'spk_id' => $spkId]);

        DB::beginTransaction();
        try {
            $processedCount = 0;
            $spk = Spk::findOrFail($spkId);

            $uniqueSections = [];
            $lastSectionName = $sectionName; // Default to request's section_name
            $isReupload = false;

            foreach ($attachments as $att) {
                $tempPath = $att['path'];
                $docId = $att['document_id'];
                $type = $att['type']; // Filename/Type

                if (!Storage::disk('customers_external')->exists($tempPath)) {
                    Log::warning("Batch Process: Temp file not found: $tempPath");
                     // Try with/without leading slash just in case
                     if (Storage::disk('customers_external')->exists(ltrim($tempPath, '/'))) {
                        $tempPath = ltrim($tempPath, '/');
                    } else {
                        Log::error("Batch Process: REALLY not found: $tempPath");
                        continue;
                    }
                }

                $tenantConnection = tenancy()->tenant ? 'tenant' : config('database.default');
                $targetDoc = DocumentTrans::on($tenantConnection)->with('sectionTrans')->find($docId);

                if (!$targetDoc) {
                    Log::warning("Batch Process: DocumentTrans $docId not found");
                    continue;
                }

                // Collect Unique Section Names & Track Last Section
                if ($targetDoc->sectionTrans) {
                    $uniqueSections[$targetDoc->sectionTrans->id] = $targetDoc->sectionTrans->section_name;
                    $lastSectionName = $targetDoc->sectionTrans->section_name; // Update last section
                }

                // Check Reupload
                // Condition: 
                // 1. Fixing Rejection (correction_attachment is TRUE)
                // 2. Replacing Existing File (url_path_file not empty)
                // Note: We REMOVED 'verify === false' check because default value for fresh doc is FALSE.
                if (
                    $targetDoc->correction_attachment || 
                    (!empty($targetDoc->url_path_file))
                ) {
                    $isReupload = true;
                }

                // --- MAIN PROCESSING LOGIC (Adapted from upload) ---
                $fileContent = Storage::disk('customers_external')->get($tempPath);
                $ext = pathinfo($tempPath, PATHINFO_EXTENSION);
                
                $year = date('Y');
                $month = date('m');
                $shippingFolder = "shipping/{$year}/{$month}/{$spk->spk_code}";
                
                // Ensure directory exists
                if (!Storage::disk('customers_external')->exists($shippingFolder)) {
                    Storage::disk('customers_external')->makeDirectory($shippingFolder);
                }

                $cleanFileName = preg_replace('/[^A-Za-z0-9_\-]/', '_', $type);
                $newFileName = "{$cleanFileName}.{$ext}";
                $finalRelPath = "{$shippingFolder}/{$newFileName}";
                $absPath = Storage::disk('customers_external')->path($finalRelPath);

                // Save File
                Storage::disk('customers_external')->put($finalRelPath, $fileContent);

                // Post-Processing (Ghostscript/Resize)
                if (strtolower($ext) === 'pdf') {
                    // Optimized GS settings for screen
                    $this->runGhostscript($absPath, $absPath, 'medium'); 
                } 
                elseif (in_array(strtolower($ext), ['jpg', 'jpeg', 'png'])) {
                    // Simple Resize logic 
                    $this->resizeImage($absPath, 800, 75);
                }

                // Delete Temp - FROM Customers External
                Storage::disk('customers_external')->delete($tempPath);

                // Update DB
                $targetDoc->update([
                    'url_path_file' => $finalRelPath,
                    'nama_file'     => $newFileName,
                    'verify'        => $spk->internal_can_upload ? true : null, // Auto-verify if internal override
                    'correction_attachment' => false,
                    'kuota_revisi'  => ($targetDoc->kuota_revisi > 0) ? $targetDoc->kuota_revisi - 1 : 0, 
                    'updated_at'    => now(),
                ]);

                // Create Log
                DocumentStatus::on($tenantConnection)->create([
                    'id_dokumen_trans' => $targetDoc->id,
                    'status'           => 'Uploaded',
                    'by'               => $user->name,
                ]);

                $processedCount++;
            } // End Loop

            if ($processedCount > 0) {
                // Determine Consolidated Section Name (For Notification)
                $notificationSectionName = $sectionName; // Default
                if (count($uniqueSections) > 0) {
                    $notificationSectionName = implode(' dan ', $uniqueSections); 
                }
                
                // 2. Update SPK Status (Batch - Use LAST Section Only)
                // ID 3 = Reuploaded (Index 1), ID 1 = Upload (Index 2)
                $statusId = $isReupload ? 3 : 1; 
                $statusText = $isReupload ? "{$lastSectionName} Reuploaded" : "{$lastSectionName} Uploaded";

                SpkStatus::create([
                    'id_spk' => $spk->id,
                    'id_status' => $statusId, 
                    'status' => $statusText,
                ]);

                // 3. Send Notification (Batch - Use Consolidated Name)
                $this->sendBatchUploadNotification($spk, $notificationSectionName, $user, $processedCount);
                
                // Realtime Update (Use Last Section name for consistency if needed, but 'batch_upload' type handles it)
                ShippingDataUpdated::dispatch($spk->id, 'batch_upload');
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'processed' => $processedCount,
                'message' => "$processedCount documents processed successfully."
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Batch Process Error: " . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
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

    public function sectionReminder(Request $request)
    {
        $validated = $request->validate([
            'section'   => 'required|string', // Sebenarnya ini section ID
            'spk_id'    => 'required|integer',
            'documents' => 'nullable|array', // Menerima array [doc_id => temp_path]
        ]);

        $user = auth('web')->user();

        if ($user->role === 'eksternal') {
            // Cari perusahaan terkait
            $perusahaan = Perusahaan::find($user->id_perusahaan);
            if (!$perusahaan) {
                return redirect()->back()->withErrors(['error' => 'Perusahaan tidak ditemukan']);
            }

            // Cari user internal dengan role staff di perusahaan ini
            $staff = User::where('id_perusahaan', $perusahaan->id_perusahaan)
                ->where('role', 'internal')
                ->where('role_internal', 'staff')
                ->first();

            // --- INISIALISASI TENANT ---
            $tenant = Tenant::where('perusahaan_id', $perusahaan->id_perusahaan)->first();
            if ($tenant) {
                tenancy()->initialize($tenant);
            }

            // Ambil data SPK jika ada (sudah di koneksi tenant)
            $spk = Spk::find($validated['spk_id']);

            if (!$spk) {
                return redirect()->back()->withErrors(['error' => 'SPK tidak ditemukan pada tenant DB']);
            }

            if (!empty($validated['documents'])) {
                $disk = Storage::disk('customers_external'); // C:/Users/IT/Herd/customers

                foreach ($validated['documents'] as $docId => $tempPath) {
                    // 1. Cek apakah file temp benar-benar ada
                    if ($tempPath && $disk->exists($tempPath)) {
                        
                        // Tentukan lokasi baru (Permanent)
                        // Misal: documents/transaction/{filename}
                        // Hasil akhir di Windows: C:/Users/IT/Herd/customers/documents/transaction/{filename}
                        $filename = basename($tempPath);
                        $permanentDir = 'documents/transaction';
                        $newPath = $permanentDir . '/' . $filename;

                        // Buat folder jika belum ada
                        if (!$disk->exists($permanentDir)) {
                            $disk->makeDirectory($permanentDir);
                        }

                        // 2. Pindahkan file dari Temp ke Permanent
                        $moveSuccess = $disk->move($tempPath, $newPath);

                        if ($moveSuccess) {
                            // 3. Update Database (DocumentTrans)
                            // Karena tenancy sudah initialized, DocumentTrans akan mengarah ke DB Tenant
                            $docTrans = DocumentTrans::find($docId);
                            
                            if ($docTrans) {
                                $docTrans->update([
                                    'url_path_file' => $newPath, // Simpan path baru
                                    // 'upload_by'     => null, // Removed as per request
                                    'verify'        => $spk->internal_can_upload ? true : $docTrans->verify, // Auto-verify if internal_can_upload
                                    'updated_at'    => now(),
                                ]);
                            }
                        }
                    }
                }

                // REALTIME UPDATE
                try {
                    // $spk is already available here
                   ShippingDataUpdated::dispatch($spk->id, 'upload');
               } catch (\Exception $e) {
                   Log::error('Realtime update failed: ' . $e->getMessage());
               }
            }
            // dd($staff, $user, $spk); // Removed dd to allow flow to continue

            try {
                SectionReminderService::send($validated['section'], $staff, $user, $spk);
                
                // Kirim notifikasi ke staff (dalam try-catch terpisah agar tidak block email)
                try {
                    NotificationService::send([
                        'id_section' => (int)$validated['section'], // NEW: dedicated column
                        'id_spk' => $spk->id,
                        'role' => 'internal',
                        'data' => [
                            'type' => 'section_reminder',
                            'title' => 'Reminder Section',
                            'message' => "Section {$validated['section']} perlu diselesaikan untuk SPK #{$spk->spk_code}",
                            'url' => url("/shipping/{$spk->id}"),
                            'section' => $validated['section'],
                            'spk_code' => $spk->spk_code,
                        ],
                    ]);
                } catch (\Throwable $notifError) {
                    // Log error notifikasi tapi jangan block flow utama
                    Log::error('Failed to send notification in sectionReminder', [
                        'error' => $notifError->getMessage(),
                        'trace' => $notifError->getTraceAsString(),
                    ]);
                }
                
                return redirect()->back()->with('success', 'Reminder berhasil dikirim ke staff.');
            } catch (\Throwable $e) {
                // Log error lengkap untuk debugging
                Log::error('sectionReminder failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'user_id' => $user->id_user,
                    'spk_id' => $validated['spk_id'],
                ]);
                
                return redirect()->back()->withErrors(['error' => 'Gagal mengirim reminder: ' . $e->getMessage()]);
            }
        }

        return redirect()->back();
    }

    /**
     * Update deadline_date for sections
     * Supports both unified (same date for all) and individual (per-section) mode
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateSectionDeadline(Request $request)
    {
        $user = auth('web')->user();
        
        // Initialize tenant context
        if ($user && $user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            if ($tenant) {
                tenancy()->initialize($tenant);
            }
        }

        $request->validate([
            'spk_id' => 'required|integer',
            'unified' => 'required|boolean',
            'global_deadline' => 'nullable|date',
            'section_deadlines' => 'nullable|array',
            'section_deadlines.*' => 'nullable|date',
        ]);

        try {
            $spkId = $request->input('spk_id');
            $isUnified = $request->input('unified');
            $globalDeadline = $request->input('global_deadline');
            $sectionDeadlines = $request->input('section_deadlines', []);

            // Get all sections for this SPK
            $sections = SectionTrans::where('id_spk', $spkId)->get();

            if ($isUnified && $globalDeadline) {
                // Unified mode: Apply same deadline to all sections
                foreach ($sections as $section) {
                    $section->update([
                        'deadline' => true,
                        'deadline_date' => Carbon::parse($globalDeadline),
                    ]);
                }
                
                Log::info('Deadline updated (unified mode)', [
                    'spk_id' => $spkId,
                    'deadline' => $globalDeadline,
                    'sections_count' => $sections->count(),
                ]);
            } else {
                // Individual mode: Update each section separately
                foreach ($sections as $section) {
                    $sectionId = $section->id;
                    if (isset($sectionDeadlines[$sectionId]) && $sectionDeadlines[$sectionId]) {
                        $section->update([
                            'deadline' => true,
                            'deadline_date' => Carbon::parse($sectionDeadlines[$sectionId]),
                        ]);
                    }
                }
                
                Log::info('Deadline updated (individual mode)', [
                    'spk_id' => $spkId,
                    'deadlines' => $sectionDeadlines,
                ]);
            }
            DB::commit();

            // REALTIME UPDATE
            try {
                ShippingDataUpdated::dispatch($spkId, 'deadline_update'); // Use $spkId instead of $validated['spk_id']
            } catch (\Exception $e) {
                Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Deadline updated successfully'
            ]);

        } catch (\Throwable $e) {
            Log::error('Failed to update deadline', [
                'error' => $e->getMessage(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update deadline: ' . $e->getMessage(),
            ], 500);
        }
    }
}

