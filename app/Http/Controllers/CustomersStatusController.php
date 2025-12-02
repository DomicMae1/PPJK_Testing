<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerAttach;
use App\Models\Customers_Status;
use App\Models\Perusahaan;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\DB;

class CustomersStatusController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $customerId = $request->query('customer_id');

        if (!$customerId) {
            return response()->json(['error' => 'Customer ID is required.'], 400);
        }

        $status = Customers_Status::with([
            'user',
            'status1Approver',
            'status2Approver',
            'status3Approver',
            'status4Approver',
        ])->where('id_Customer', $customerId)->first();

        if (!$status) {
            return response()->json(['message' => 'Status belum tersedia.'], 404);
        }

        $statusData = $status->toArray();
        $statusData['nama_user'] = $status->user?->name ?? null;
        $statusData['status_1_by_name'] = $status->status1Approver?->name ?? null;
        $statusData['status_2_by_name'] = $status->status2Approver?->name ?? null;
        $statusData['status_3_by_name'] = $status->status3Approver?->name ?? null;
        $statusData['status_4_by_name'] = $status->status4Approver?->name ?? null;

        return response()->json($statusData);
    }


    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Customers_Status $customers_Status)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Customers_Status $customers_Status)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Customers_Status $customers_Status)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Customers_Status $customers_Status)
    {
        //
    }

    public function submit(Request $request)
    {

        $request->validate([
            'customer_id' => 'required|exists:customers_statuses,id_Customer',
            'keterangan' => 'nullable|string',
            'attach' => 'nullable|file|mimes:pdf|max:5120',
            'submit_1_timestamps' => 'nullable|date',
            'status_1_timestamps' => 'nullable|date',
            'status_2_timestamps' => 'nullable|date',
        ]);

        $status = Customers_Status::where('id_Customer', $request->customer_id)->first();
        if (!$status) return back()->with('error', 'Data status customer tidak ditemukan.');
        
        $customer = $status->customer;

        // 1. Ambil Info Perusahaan untuk Folder Name
        $idPerusahaan = $request->input('id_perusahaan');
        $perusahaan = Perusahaan::find($idPerusahaan);
        
        // Default slug jika perusahaan tidak ketemu
        $companySlug = 'general'; 
        $emailsToNotify = [];

        if ($perusahaan) {
            $companySlug = Str::slug($perusahaan->nama_perusahaan);

            if (!empty($perusahaan->notify_1)) {
                $emailsToNotify = explode(',', $perusahaan->notify_1);
            }
        }

        $status = Customers_Status::where('id_Customer', $request->customer_id)->first();

        if (!$status) {
            return back()->with('error', 'Data status customer tidak ditemukan.');
        }

        $user = Auth::user();
        $userId = $user->id;
        $role = $user->getRoleNames()->first();
        $now = Carbon::now();
        $nama = $user->name;

        if ($request->filled('submit_1_timestamps')) $status->submit_1_timestamps = $request->input('submit_1_timestamps');
        if ($request->filled('status_1_timestamps')) {
            $status->status_1_timestamps = $request->input('status_1_timestamps');
            $status->status_1_by = $userId;
        }
        if ($request->filled('status_2_timestamps')) {
            $status->status_2_timestamps = $request->input('status_2_timestamps');
            $status->status_2_by = $userId;
        }
        $isDirekturCreator = ($customer->id_user === $userId && $role === 'direktur');
        $isManagerCreator = ($customer->id_user === $userId && $role === 'manager');

        $filename = null;
        $path = null;

        if ($request->hasFile('attach')) {

            $file = $request->file('attach');
            $lastFromAttach = CustomerAttach::where('customer_id', $customer->id)
                ->get()
                ->map(function ($row) {
                    $file = $row->nama_file;

                    // pisahkan berdasarkan "-"
                    $parts = explode('-', $file);
                    if (count($parts) < 3) return 0;

                    // ORDER ada di index ke-1 → e.g. 003
                    return intval($parts[1]);
                })
                ->max() ?? 0;

            $status = Customers_Status::where('id_Customer', $customer->id)->first();

            $statusFields = [
                'submit_1_nama_file',
                'status_1_nama_file',
                'status_2_nama_file',
                'submit_3_nama_file',
                'status_4_nama_file',
            ];

            $lastFromStatus = 0;

            if ($status) {
                foreach ($statusFields as $field) {

                    $fileName = $status->$field;
                    if (!$fileName) continue;

                    $parts = explode('-', $fileName);
                    if (count($parts) < 3) continue;

                    // ORDER = index ke-1
                    $orderNum = intval($parts[1]);

                    $lastFromStatus = max($lastFromStatus, $orderNum);
                }
            }

            // Urutan baru
            $lastOrder = max($lastFromAttach, $lastFromStatus);
            $newOrder = $lastOrder + 1;

            // Format 3 digit → 001, 002, 003, ...
            $order = str_pad($newOrder, 3, '0', STR_PAD_LEFT);

            $npwpRaw = $customer->no_npwp ?? '0000000000000000';
            $npwpSanitized = preg_replace('/[^0-9]/', '', $npwpRaw);
            
            // 3. Tipe Dokumen (Berdasarkan Role yang Upload)
            $docType = match ($role) {
                'user'     => 'marketing_review',
                'manager'  => 'manager_review',
                'direktur' => 'director_review',
                'lawyer'   => 'lawyer_review',
                'auditor'  => 'audit_review',
                default    => 'attachment'
            };

            // B. BENTUK NAMA FILE
            // Format: 001-123456789-marketing_att.pdf
            $ext = $file->getClientOriginalExtension();
            $filename = "{$npwpSanitized}-{$order}-{$docType}.{$ext}";
            $mode = 'medium'; // default compress mode

            // Folder final: {companySlug}/attachment
            $folderPath = $companySlug . '/attachment';

            if (!Storage::disk('customers_external')->exists($folderPath)) {
                Storage::disk('customers_external')->makeDirectory($folderPath);
            }

            // Path final (full)
            $publicRelative = $folderPath . '/' . $filename;
            $outputFullPath = Storage::disk('customers_external')->path($publicRelative);

            // -------------------- A. KOMPRES PDF ------------------------
            if ($file->getClientMimeType() === 'application/pdf') {

                // 1. Simpan raw PDF sementara di storage lokal
                $tempRaw = $file->storeAs('temp', 'raw_' . $filename, 'local');
                $inputPath = Storage::disk('local')->path($tempRaw);

                $inputWin = str_replace('/', '\\', $inputPath);
                $outputWin = str_replace('/', '\\', $outputFullPath);

                // CONFIG Ghostscript
                $settings = [
                    'medium' => [
                        '-dPDFSETTINGS=/ebook',
                        '-dColorImageResolution=200',
                        '-dGrayImageResolution=200',
                        '-dMonoImageResolution=200',
                    ],
                ];

                $config = $settings['medium'];
                $gsExe = 'C:\Program Files\gs\gs10.05.1\bin\gswin64c.exe';

                $command = array_merge(
                    [$gsExe, '-q', '-dSAFER', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4'],
                    $config,
                    [
                        '-dEmbedAllFonts=false',
                        '-dSubsetFonts=true',
                        '-dColorImageDownsampleType=/Bicubic',
                        '-dGrayImageDownsampleType=/Bicubic',
                        '-dMonoImageDownsampleType=/Bicubic',
                        '-o', $outputWin,
                        $inputWin
                    ]
                );

                $gsTemp = storage_path('app/gs_temp');
                if (!file_exists($gsTemp)) mkdir($gsTemp, 0777, true);
                $gsTempWin = str_replace('/', '\\', $gsTemp);

                $process = new Process(
                    command: $command,
                    env: [
                        'TEMP' => $gsTempWin,
                        'TMP' => $gsTempWin,
                        'SystemRoot' => getenv('SystemRoot'),
                        'Path' => getenv('Path')
                    ]
                );
                $process->setTimeout(300);
                $process->run();

                // Jika sukses
                if ($process->isSuccessful() && file_exists($outputFullPath)) {

                    @unlink($inputPath); // hapus raw

                    $path = $publicRelative; // simpan path final
                }
                // Jika gagal compress → fallback ke copy original
                else {
                    Storage::disk('customers_external')->put($publicRelative, file_get_contents($inputPath));
                    @unlink($inputPath);

                    $path = $publicRelative;
                }
            }

            else {
                $path = $file->storeAs($folderPath, $filename, 'customers_external');
            }
        }

        $customer = $status->customer;

        switch ($role) {
            case 'user':
                $status->submit_1_timestamps = $now;
                if ($filename) {
                    $status->submit_1_nama_file = $filename;
                    $status->submit_1_path = $path;
                }

                // 🔹 Kirim email hanya jika perusahaan TIDAK punya manager
                // if ($perusahaan && !$perusahaan->hasManager()) {
                //     if (!empty($perusahaan->notify_1)) {
                //         $emailsToNotify = explode(',', $perusahaan->notify_1);
                //     }

                //     if (!empty($emailsToNotify)) {
                //         try {
                //             Mail::to($emailsToNotify)->send(new \App\Mail\CustomerSubmittedMail($customer));
                //         } catch (\Exception $e) {
                //             Log::error("Gagal kirim email lawyer (tanpa manager): " . $e->getMessage());
                //         }
                //     }
                // }

                break;

            case 'manager':
                $status->status_1_by = $userId;
                $status->status_1_timestamps = $now;
                $status->status_1_keterangan = $request->keterangan;
                if ($filename) {
                    $status->status_1_nama_file = $filename;
                    $status->status_1_path = $path;
                }
                if ($isManagerCreator) {
                    if (empty($status->submit_1_timestamps)) {
                        $status->submit_1_timestamps = $now;
                    }
                }
                // if ($perusahaan && $perusahaan->hasManager()) {
                //     if (!empty($perusahaan->notify_1)) {
                //         $emailsToNotify = explode(',', $perusahaan->notify_1);
                //     }

                //     if (!empty($emailsToNotify)) {
                //         try {
                //             Mail::to($emailsToNotify)->send(new \App\Mail\CustomerSubmittedMail($customer));
                //         } catch (\Exception $e) {
                //             Log::error("Gagal kirim email lawyer (setelah manager): " . $e->getMessage());
                //         }
                //     }
                // }
                break;

            case 'direktur':
                $status->status_2_by = $userId;
                $status->status_2_timestamps = $now;
                $status->status_2_keterangan = $request->keterangan;
                if ($filename) {
                    $status->status_2_nama_file = $filename;
                    $status->status_2_path = $path;
                }

                if ($isDirekturCreator) {
                    if (empty($status->submit_1_timestamps)) {
                        $status->submit_1_timestamps = $now;
                    }

                    if (empty($status->status_1_timestamps)) {
                        $status->status_1_timestamps = $now;
                        $status->status_1_by = $userId;
                    }
                }
                break;

            case 'lawyer':
                $status->status_3_by = $userId;
                $status->status_3_timestamps = $now;
                $status->status_3_keterangan = $request->keterangan;
                if ($filename) {
                    $status->submit_3_nama_file = $filename;
                    $status->submit_3_path = $path;
                }

                if ($request->has('status_3')) {
                    $validStatuses = ['approved', 'rejected'];
                    $statusValue = strtolower($request->status_3);

                    if (in_array($statusValue, $validStatuses)) {
                        $status->status_3 = $statusValue;
                    }

                    if ($statusValue === 'rejected') {
                        $validEmails = collect($emailsToNotify)
                            ->map(fn($email) => trim($email))
                            ->filter(fn($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
                            ->unique()
                            ->toArray();

                        Log::info('Akan mengirim email ke:', $validEmails);

                        $customer = $status->customer;

                        if (!empty($validEmails)) {
                            Mail::to($validEmails)->send(new \App\Mail\StatusRejectedMail($status, $user, $customer));
                        } else {
                            Mail::to('default@example.com')->send(new \App\Mail\StatusRejectedMail($status, $user, $customer));
                        }
                    }
                }
                break;

            case 'auditor':
                $status->status_4_by = $userId;
                $status->status_4_timestamps = $now;
                $status->status_4_keterangan = $request->keterangan;
                if ($filename) {
                    $status->status_4_nama_file = $filename;
                    $status->status_4_path = $path;
                }
                break;

            default:
                return back()->with('error', 'Role tidak dikenali.');
        }

        Log::info("Submit oleh {$nama} ({$role})", [
            'customer_id' => $request->customer_id,
            'timestamp' => $now->toDateTimeString(),
            'keterangan' => $request->keterangan,
            'attachment' => $path
        ]);

        $status->save();

        return back()->with('success', 'Data berhasil disubmit.');
    }
}
