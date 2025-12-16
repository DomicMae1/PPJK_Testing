<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerLink;
use App\Models\CustomerAttach;
use App\Models\Customers_Status;
use App\Models\Perusahaan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
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

class CustomerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = auth('web')->user();

        if (!$user->hasPermissionTo('view-master-customer')) {
            throw UnauthorizedException::forPermissions(['view-master-customer']);
        }

        $customerStatus = Customers_Status::on('tako-perusahaan')->get();
        $query = Customer::with([
            'creator',
            'perusahaan',
            'status',
            'status.submit1By',
            'status.status1Approver',
            'status.status2Approver',
            'status.status3Approver',
            'customer_links'
        ]);

        if ($user->hasRole('user')) {
            if ($user->id_perusahaan) {
                $query->where('id_perusahaan', $user->id_perusahaan)
                    ->where('id_user', $user->id);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user->hasRole(['manager', 'direktur', 'lawyer'])) {
            $perusahaanIds = DB::connection('tako-perusahaan')
                ->table('perusahaan_user_roles')
                ->where('user_id', $user->id)
                ->pluck('id_perusahaan')
                ->toArray();

            if (!empty($perusahaanIds)) {
                $query->whereIn('id_perusahaan', $perusahaanIds);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        $suppliers = $query->get();

        $customerData = $suppliers->map(function ($customer) {
            $status = $customer->status;
            $tanggal = null;
            $label = null;
            $userName = null;
            $note = null;

            if ($status?->status_3_timestamps) {
                $tanggal = $status->status_3_timestamps;
                $label = 'direview';
                $userName = $status->status3Approver?->name ?? '-';
                $note = $status->status_3_keterangan;
            } elseif ($status?->status_2_timestamps) {
                $tanggal = $status->status_2_timestamps;
                $label = 'diketahui';
                $userName = $status->status2Approver?->name ?? '-';
                $note = $status->status_2_keterangan;
            } elseif ($status?->status_1_timestamps) {
                $tanggal = $status->status_1_timestamps;
                $label = 'diverifikasi';
                $userName = $status->status1Approver?->name ?? '-';
                $note = $status->status_1_keterangan;
            } elseif ($status?->submit_1_timestamps) {
                $tanggal = $status->submit_1_timestamps;
                $label = 'disubmit';
                $userName = $status->submit1By?->name ?? '-';
            } else {
                $tanggal = $customer->created_at;
                $label = 'diinput';
                $userName = $customer->creator?->name ?? '-';
            }

            return [
                'id' => $customer->id,
                'nama_perusahaan' => $customer->perusahaan?->nama_perusahaan ?? '-',
                'nama_customer' => $customer->nama_perusahaan ?? '-',
                'tanggal_status' => $tanggal,
                'status_label' => $label,
                'status' => $status?->status_3 ?? '-',
                'note' => $note,
                'nama_user' => $userName,
                'creator_name' => $customer->creator?->name ?? '-',
                'no_telp_personal' => $customer->no_telp_personal,
                'creator' => [
                    'name' => $customer->creator?->name,
                    'role' => $customer->creator?->roles?->first()?->name,
                ],
                'submit_1_timestamps' => $status?->submit_1_timestamps,
                'status_2_timestamps' => $status?->status_2_timestamps,
                'customer_link' => [
                    'url' => $customer->customer_links?->url,
                ],
                'user_id' => $customer->user_id,
            ];
        });


        return Inertia::render('m_customer/page', [
            'customers' => $customerData,
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

        if (!$user->hasPermissionTo('create-master-customer')) {
            throw UnauthorizedException::forPermissions(['create-master-customer']);
        }

        return Inertia::render('m_customer/table/add-data-form', [
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

        if (!$user->hasPermissionTo('create-master-customer')) {
            throw UnauthorizedException::forPermissions(['create-master-customer']);
        }

        return Inertia::render('m_customer/table/generate-data-form', [
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

        if (!$user->hasPermissionTo('create-master-customer')) {
            throw UnauthorizedException::forPermissions(['create-master-customer']);
        }

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
            $roles = $user->getRoleNames();

            if ($roles->contains('user')) {
                $idPerusahaan = $user->id_perusahaan;
            } elseif ($roles->contains('manager') || $roles->contains('direktur')) {
                $idPerusahaan = $request->id_perusahaan;
            }

            $customer = Customer::create(array_merge($validated, [
                'id_user' => $user->id,
                'id_perusahaan' => $idPerusahaan,
            ]));

            if (!empty($validated['attachments'])) {
                if ($idPerusahaan) {
                    $perusahaan = Perusahaan::find($idPerusahaan);
                    if ($perusahaan) {
                        // Convert name of company (example: "PT Alpha" -> "pt-alpha")
                        $companySlug = Str::slug($perusahaan->nama_perusahaan);

                        if ($perusahaan->tenant && $perusahaan->tenant->domains->isNotEmpty()) {
                            $customDomain = $perusahaan->tenant->domains->first()->domain;
                        }
                    }
                }

                $finalAttachments = $this->processAndMoveFiles($validated['attachments'], $companySlug);
                foreach ($finalAttachments as $attachment) {
                    if (!str_starts_with($attachment['path'], 'blob:')) {
                        CustomerAttach::create([
                            'customer_id' => $customer->id,
                            'nama_file' => $attachment['nama_file'],
                            'path' => $attachment['path'],
                            'type' => $attachment['type'],
                        ]);
                    }
                }
            }

            DB::connection('tako-perusahaan')->table('customers_statuses')->insert([
                'id_Customer' => $customer->id,
                'id_user' => $user->id,
                'submit_1_timestamps' => null,
                'status_1_by' => null,
                'status_1_timestamps' => null,
                'status_1_keterangan' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return Inertia::location(route('customer.show', $customer->id));
        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan: ' . $th->getMessage()]);
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

            $link = CustomerLink::on('tako-perusahaan')
                ->where('id_user', $userId)
                ->whereNull('id_customer')
                ->where('is_filled', false)
                ->latest('id_link')
                ->first();

            if (!$link) {
                throw new \Exception('Link tidak ditemukan atau sudah digunakan.');
            }

            $id_perusahaan = $link->id_perusahaan;

            $customer = Customer::create(array_merge($validated, [
                'id_user' => $userId,
                'id_perusahaan' => $id_perusahaan,
            ]));


            if (!empty($validated['attachments'])) {
                $finalAttachments = $this->processAndMoveFiles($validated['attachments'], $validated['nama_perusahaan']);
                foreach ($finalAttachments as $attachment) {
                    if (!str_starts_with($attachment['path'], 'blob:')) {
                        CustomerAttach::create([
                            'customer_id' => $customer->id,
                            'nama_file' => $attachment['nama_file'],
                            'path' => $attachment['path'],
                            'type' => $attachment['type'],
                        ]);
                    }
                }
            }

            DB::connection('tako-perusahaan')->table('customers_statuses')->insert([
                'id_Customer' => $customer->id,
                'id_user' => $userId,
                'submit_1_timestamps' => null,
                'status_1_by' => null,
                'status_1_timestamps' => null,
                'status_1_keterangan' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            CustomerLink::on('tako-perusahaan')
                ->where('id_user', $userId)
                ->whereNull('id_customer')
                ->where('is_filled', false)
                ->latest('id_link')
                ->first()?->update([
                    'id_customer' => $customer->id,
                    'is_filled' => true,
                    'filled_at' => now(),
                ]);


            DB::commit();

            return response()->json([
                'message' => 'Data Anda berhasil dibuat!',
            ], 200);
        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan: ' . $th->getMessage()], 500);
        }
    }

    private function processAndMoveFiles(array $attachments, string $namaPerusahaan)
    {
        $processedAttachments = [];
        $disk = Storage::disk('customers_external'); // Pastikan config disk ini benar

        foreach ($attachments as $att) {
            $currentPath = $att['path'];
            $fileName = $att['nama_file'];

            // Cek apakah path diawali dengan 'temp/' (artinya file baru upload)
            if (Str::startsWith($currentPath, 'temp/')) {
                $newPath = $namaPerusahaan . '/customers/' . $fileName;

                // Cek apakah file fisik benar-benar ada di temp
                if ($disk->exists($currentPath)) {
                    // Hapus file lama di tujuan jika ada (overwrite conflict)
                    if ($disk->exists($newPath)) {
                        $disk->delete($newPath);
                    }

                    // Pindahkan file
                    $disk->move($currentPath, $newPath);
                    
                    // Update path di array untuk disimpan ke DB
                    $att['path'] = $newPath;
                }
            } 
            
            // Masukkan ke array hasil (baik yang dipindah maupun yang sudah lama)
            $processedAttachments[] = $att;
        }

        return $processedAttachments;
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
        // File Name Validation & Preparation
        $file = $request->file('pdf') ?? $request->file('file');
        if (!$file) return response()->json(['error' => 'File tidak ditemukan'], 400);

        $order       = $request->input('order');         
        $npwpNumber  = $request->input('npwp_number'); 
        $type        = $request->input('type');         

        // Process make file by ur format 
        $order = str_pad(intval($order), 3, '0', STR_PAD_LEFT);
        $npwpSanitized = preg_replace('/[^0-9]/', '', $npwpNumber);
        $type = strtolower($type);

        $ext = $file->getClientOriginalExtension();

        // example: 001-123456789012345-file.pdf
        $filename = "{$npwpSanitized}-{$order}-{$type}.{$ext}";
        $mode = $request->input('mode', 'medium');
        $idPerusahaan = $request->input('id_perusahaan');
        
        $companySlug = 'general'; // Default folder if there's no company folder
        $customDomain = null;

        if ($idPerusahaan) {
            $perusahaan = Perusahaan::find($idPerusahaan);
            if ($perusahaan) {
                // Convert name of company (example: "PT Alpha" -> "pt-alpha")
                $companySlug = Str::slug($perusahaan->nama_perusahaan);

                if ($perusahaan->tenant && $perusahaan->tenant->domains->isNotEmpty()) {
                    $customDomain = $perusahaan->tenant->domains->first()->domain;
                }
            }
        }

        $protocol = $request->secure() ? 'https://' : 'http://';
        $baseUrl = $customDomain ? ($protocol . $customDomain) : $request->getSchemeAndHttpHost();

        $disk = Storage::disk('customers_external');
        $tempFolder = 'temp'; 
        $tempPathRel = $tempFolder . '/' . $filename;

        // $folderPathRel = $companySlug . '/customers'; 
        
        // // URL Final example: http://alpha.test/file/view/pt-alpha/1234_file.pdf
        // $finalUrl = $companySlug . '/customers/' . $filename;

        // Create a Folder If It Doesn't Exist (IMPORTANT!)
        if (!$disk->exists($tempFolder)) {
            $disk->makeDirectory($tempFolder);
        }

        $inputPath = $file->storeAs('temp_raw', 'raw_' . $filename, 'local'); // Raw di local storage app
        $inputFullPath = Storage::disk('local')->path($inputPath);
        $outputFullPath = $disk->path($tempPathRel);

        // Process Files (PDF / Non-PDF)
        
        if ($file->getClientMimeType() === 'application/pdf') {
            
            $tempPathRaw = $file->storeAs('temp', 'raw_' . $filename, 'local');
            $inputPath = Storage::disk('local')->path($tempPathRaw);
            
            // Path Output (Target ke /mnt/CR lewat mapping docker)
            $publicPathRel = $tempPathRel . '/' . $filename;
            $outputPath = $disk->path($publicPathRel);

            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $inputOSPath  = str_replace('/', '\\', $inputPath);
                $outputOSPath = str_replace('/', '\\', $outputPath);
            } else {
                $inputOSPath  = $inputPath;
                $outputOSPath = $outputPath;
            }

            $settings = [
                'ultra_small' => ['-dPDFSETTINGS=/screen', '-dColorImageResolution=72', '-dGrayImageResolution=72', '-dMonoImageResolution=72', '-dDownsampleColorImages=true'],
                'small'       => ['-dPDFSETTINGS=/ebook', '-dColorImageResolution=150', '-dGrayImageResolution=150', '-dMonoImageResolution=150'],
                'medium'      => ['-dPDFSETTINGS=/ebook', '-dColorImageResolution=200', '-dGrayImageResolution=200', '-dMonoImageResolution=200'],
                'high'        => ['-dPDFSETTINGS=/printer', '-dColorImageResolution=300', '-dGrayImageResolution=300', '-dMonoImageResolution=300'],
                'extreme'     => ['-dPDFSETTINGS=/screen', '-dColorImageResolution=50', '-dGrayImageResolution=50', '-dMonoImageResolution=50'],
                'insane'      => [
                    '-dPDFSETTINGS=/screen', '-dColorImageResolution=40', '-dGrayImageResolution=40', '-dMonoImageResolution=40',
                    '-sColorConversionStrategy=Gray', '-sProcessColorModel=DeviceGray', '-dOverrideICC=true'
                ]
            ];
            //Default compress 'medium'
            $selectedConfig = $settings[$mode] ?? $settings['medium'];
            $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
            $gsExe = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN'
                ? 'C:\Program Files\gs\gs10.05.1\bin\gswin64c.exe'
                : '/usr/bin/gs';
            $commandArgs = array_merge(
                [$gsExe, '-q', '-dSAFER', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4'],
                $selectedConfig,
                ['-dEmbedAllFonts=false', '-dSubsetFonts=true', '-dColorImageDownsampleType=/Bicubic', '-dGrayImageDownsampleType=/Bicubic', '-dMonoImageDownsampleType=/Bicubic', '-o', $outputOSPath, $inputOSPath]
            );
            $gsTempDir = storage_path('app/gs_temp');
            if (!file_exists($gsTempDir)) mkdir($gsTempDir, 0777, true);
            $gsTempEnv = $isWindows ? str_replace('/', '\\', $gsTempDir) : $gsTempDir;

            // Setup Environment Variables
            $envVars = [
                'TEMP' => $gsTempEnv,
                'TMP'  => $gsTempEnv,
            ];

            // Tambahan untuk Windows agar GS bisa jalan
            if ($isWindows) {
                $envVars['SystemRoot'] = getenv('SystemRoot');
                $envVars['Path'] = getenv('Path');
            }
            $process = new Process(command: $commandArgs, env: $envVars);
            $process->setTimeout(300);
            $process->run();

            if ($process->isSuccessful() && file_exists($outputFullPath)) {
                @unlink($inputFullPath);
                return response()->json([
                    'status' => 'success',
                    'path' => $tempPathRel,
                    'nama_file' => $filename,
                    'info' => 'Compressed (' . $mode . ')',
                    'is_temp' => true
                ]);
            } else {
                $disk->put($tempPathRel, file_get_contents($inputFullPath));
                @unlink($inputFullPath);

                return response()->json([
                    'status' => 'warning',
                    'path' => $tempPathRel,
                    'nama_file' => $filename,
                    'warning' => 'Compression failed, using original file.',
                    'is_temp' => true
                ]);
            }
        } 
        else {
            $file->storeAs($tempPathRel, $filename, 'customers_external');
            
            return response()->json([
                'path' => $tempPathRel,           
                'nama_file' => $filename,
            ]);
        }
    }


    /**
     * Display the specified resource.
     */
    public function show(Customer $customer)
    {
        $user = auth('web')->user();

        if (!$user->hasRole('auditor') && !$user->hasPermissionTo('view-master-customer')) {
            throw UnauthorizedException::forPermissions(['view-master-customer']);
        }

        if ($user->hasRole('auditor')) {
            $customer->load('attachments');

            return Inertia::render('m_customer/table/view-data-form', [
                'customer' => $customer,
                'attachments' => $customer->attachments,
            ]);
        }

        $userCompanyIds = $user->companies()->pluck('perusahaan.id')->toArray();

        if (!empty($user->id_perusahaan)) {
            $userCompanyIds[] = $user->id_perusahaan;
        }
        if (!in_array($customer->id_perusahaan, $userCompanyIds)) {
            abort(403, 'Anda tidak memiliki akses ke data customer ini.');
        }

        $customer->load('attachments');

        return Inertia::render('m_customer/table/view-data-form', [
            'customer' => $customer,
            'attachments' => $customer->attachments,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Customer $customer)
    {
        $user = auth('web')->user();

        $customer->load('attachments');

        return Inertia::render('m_customer/table/edit-data-form', [
            'customer' => $customer->load('attachments'),
        ]);
    }


    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Customer $customer)
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

            if ($roles->contains('user')) {
                $idPerusahaan = $user->id_perusahaan;
            } elseif ($roles->contains('manager') || $roles->contains('direktur')) {
                $idPerusahaan = $request->id_perusahaan;
            }

            if ($idPerusahaan) {
                    $perusahaan = Perusahaan::find($idPerusahaan);
                    if ($perusahaan) {
                        // Convert name of company (example: "PT Alpha" -> "pt-alpha")
                        $companySlug = Str::slug($perusahaan->nama_perusahaan);
                    }
                }

            $finalAttachments = $this->processAndMoveFiles($validated['attachments'], $companySlug);

            CustomerAttach::where('customer_id', $customer->id)->delete();
            foreach ($finalAttachments as $attachment) {
                CustomerAttach::create([
                    'customer_id' => $customer->id,
                    'nama_file' => $attachment['nama_file'],
                    'path' => $attachment['path'],
                    'type' => $attachment['type'],
                ]);
            }

            DB::commit();
            return redirect()->route('customer.index')->with('success', 'Data Customer berhasil diperbarui!');
        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan: ' . $th->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Customer $customer)
    {

        try {
            DB::beginTransaction();

            $customer->delete();

            DB::commit();

            return redirect()->route('customer.index')
                ->with('success', 'Data Customer berhasil dihapus (soft delete)!');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->route('customer.index')
                ->with('error', 'Gagal menghapus Data Customer: ' . $e->getMessage());
        }
    }

    public function generatePdf($id)
    {
        Log::info("📄 Mulai generate PDF untuk customer ID: {$id}");

        $customer = Customer::with(['attachments', 'perusahaan'])->findOrFail($id);
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

    public function showPublicForm($token)
    {
        $link = CustomerLink::where('token', $token)->first();

        if (!$link) {
            abort(404, 'Link tidak valid atau sudah tidak tersedia.');
        }

        if ($link->is_filled) {
            return inertia('m_customer/table/filled-already');
        }

        Log::info('Link detail', [
            'id_user' => $link->id_user,
            'id_perusahaan' => $link->id_perusahaan,
            'token' => $token,
        ]);


        return inertia('m_customer/table/public-data-form', [
            'customer_name' => $link->nama_customer,
            'customer' => null,
            'token' => $token,
            'user_id' => $link->id_user,
            'id_perusahaan' => $link->id_perusahaan,
            'isFilled' => $link->is_filled,
        ]);
    }

    public function submitPublicForm(Request $request, $token)
    {
        $link = CustomerLink::where('token', $token)->first();

        if (!$link) {
            abort(404, 'Token tidak ditemukan');
        }

        Log::info('Link detail testing', [
            'id_perusahaan' => $link->id_perusahaan,
        ]);

        $validated = $request->validate([
            'kategori_usaha' => 'required|string',
            'nama_perusahaan' => 'required|string',
            'alamat_lengkap' => 'required|string',
            'bentuk_badan_usaha' => 'required|string',
            'kota' => 'required|string',
            'alamat_penagihan' => 'required|string',
            'email' => 'required|email',
            'top' => 'required|string',
            'status_perpajakan' => 'required|string',
            'nama_pj' => 'required|string',
            'no_ktp_pj' => 'required|string',
            'nama_personal' => 'required|string',
            'jabatan_personal' => 'required|string',
            'email_personal' => 'required|email',
        ]);

        $customer = Customer::create(array_merge($validated, [
            'id_user' => $link->id_user, 
            'id_perusahaan' => $link->id_perusahaan, 
        ]));

        return redirect('/')->with('success', 'Data berhasil dikirim.');
    }

    public function checkNpwp(Request $request)
    {
        $request->validate([
            'no_npwp' => 'required|string',
            'no_npwp_16' => 'nullable|string',
        ]);

        // 1. Cari customer berdasarkan NPWP 15 digit atau NPWP 16 digit
        $customer = Customer::where('no_npwp', $request->no_npwp)
            ->orWhere('no_npwp_16', $request->no_npwp_16)
            ->first();

        // Jika customer tidak ditemukan
        if (!$customer) {
            return response()->json([
                'exists' => false,
            ]);
        }

        // 2. Ambil id customer
        $customerId = $customer->id;

        // 3. Ambil data status dari tabel customer_statuses
        $status = Customers_Status::where('id_Customer', $customerId)->first();

        // Jika tidak ada record status
        if (!$status) {

            return response()->json([
                'exists' => true,
                'lawyer_rejected' => false,
                'note' => null,
                'auditor_note' => false,
                'auditor_note_text' => null,
            ]);

        }

        // 4. Cek lawyer reject (status_3)
        $isRejected = strtolower($status->status_3 ?? '') === 'rejected';

        // 5. Cek apakah auditor menambahkan catatan (status_4_keterangan)
        $auditorHasNote = !empty($status->status_4_keterangan);

        return response()->json([
            'exists' => true,
            // Lawyer reject
            'lawyer_rejected' => $isRejected,
            'note' => $isRejected ? ($status->status_3_keterangan ?? null) : null,
            // Auditor note
            'auditor_note' => $auditorHasNote,
            'auditor_note_text' => $auditorHasNote ? $status->status_4_keterangan : null,
        ]);
    }

}
