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
        $rawRole  = strtolower($user->getRoleNames()->first());

        $roleMap = [
            'marketing' => 'user',
            'user'      => 'user',
            'manager'   => 'manager',
            'direktur'  => 'direktur',
            'director'  => 'direktur',
            'lawyer'    => 'lawyer',
            'auditor'   => 'auditor',
        ];

        $role = $roleMap[$rawRole] ?? $rawRole;
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

        $customer = $status->customer;

        if ($request->hasFile('attach') && !$request->filled('attach_path')) {

            $file = $request->file('attach');

            $tempName = 'temp_' . uniqid() . '.pdf';
            $tempPath = 'temp/' . $tempName;

            Storage::disk('customers_external')->put(
                $tempPath,
                file_get_contents($file->getRealPath())
            );

            $request->merge([
                'attach_path'     => $tempPath,
                'attach_filename' => $file->getClientOriginalName(),
            ]);
        }

        $filename = null;
        $path = null;

        if (
            in_array($role, ['user','manager','direktur','lawyer','auditor'])
            && $request->filled('attach_path')
            && $request->filled('attach_filename')
        ) {

            $tempPath = $request->attach_path;
            $tempFull = Storage::disk('customers_external')->path($tempPath);

            Log::info('PDF BEFORE', [
                'path' => $tempFull,
                'size_kb' => round(filesize($tempFull) / 1024, 2),
            ]);


            /* === HITUNG ORDER FILE === */
            $lastFromAttach = CustomerAttach::where('customer_id', $customer->id)
                ->get()
                ->map(fn($r) => intval(explode('-', $r->nama_file)[1] ?? 0))
                ->max() ?? 0;

            $statusFields = [
                'submit_1_nama_file',
                'status_1_nama_file',
                'status_2_nama_file',
                'submit_3_nama_file',
                'status_4_nama_file',
            ];

            $lastFromStatus = collect($statusFields)
                ->map(fn($f) => intval(explode('-', $status->$f ?? '')[1] ?? 0))
                ->max() ?? 0;

            $order = str_pad(max($lastFromAttach, $lastFromStatus) + 1, 3, '0', STR_PAD_LEFT);

            /* === BUILD FILE NAME === */
            $npwp = preg_replace('/\D/', '', $customer->no_npwp ?? '') ?: '0000000000000000';

            $docType = match ($role) {
                'user'     => 'marketing_review',
                'manager'  => 'manager_review',
                'direktur' => 'director_review',
                'lawyer'   => 'lawyer_review',
                'auditor'  => 'audit_review',
            };

            $ext = pathinfo($request->attach_filename, PATHINFO_EXTENSION);
            $filename = "{$npwp}-{$order}-{$docType}.{$ext}";

            $folder = "{$companySlug}/attachment";
            Storage::disk('customers_external')->makeDirectory($folder);

            $publicRelative = "{$folder}/{$filename}";
            $outputFullPath = Storage::disk('customers_external')->path($publicRelative);

            /* ===============================
            * GHOSTSCRIPT COMPRESS
            * =============================== */
            $gsExe = '/usr/bin/gs';

            $command = [
                $gsExe,
                '-q',
                '-dSAFER',
                '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4',
                '-dPDFSETTINGS=/ebook',
                '-dColorImageResolution=200',
                '-dGrayImageResolution=200',
                '-dMonoImageResolution=200',
                '-o', $outputFullPath,
                $tempFull,
            ];

            $process = new \Symfony\Component\Process\Process($command);
            $process->setTimeout(300);
            $process->run();

            if (!$process->isSuccessful() || !file_exists($outputFullPath)) {
                // fallback copy original
                Storage::disk('customers_external')->put(
                    $publicRelative,
                    file_get_contents($tempFull)
                );
            }

            @unlink($tempFull);
            $path = $publicRelative;
        }

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

        if (file_exists($outputFullPath)) {
            Log::info('PDF AFTER', [
                'path' => $outputFullPath,
                'size_kb' => round(filesize($outputFullPath) / 1024, 2),
            ]);
        }


        Log::info('COMPRESS INPUT', [
            'role' => $role,
            'tempFull' => $tempFull,
            'exists' => file_exists($tempFull),
            'size' => file_exists($tempFull) ? filesize($tempFull) : 0,
        ]);


        $status->save();

        return back()->with('success', 'Data berhasil disubmit.');
    }
}
