<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Spatie\Permission\Exceptions\UnauthorizedException;

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

        $suppliers = Customer::all();

        return Inertia::render('m_customer/page', [
            'customers' => $suppliers,
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
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

        $validated = $request->validate([
            'nama_cust' => 'required',
            'no_npwp' => 'nullable',
            'alamat_npwp' => 'nullable',
            'alamat_penagihan' => 'nullable',
            'nama_pic' => 'nullable',
            'no_telp_pic' => 'nullable',
            'pph_info' => 'required',
            'user' => 'required',
            'ledger_id' => 'required'
        ]);

        Customer::create($validated);

        return redirect()->route('customer.index')->with('success', 'Data Customer berhasil dibuat!');
    public function storePublic(Request $request)
    {

        DB::beginTransaction();

        // dd($request->all());

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

            $customer = Customer::create(array_merge($validated, [
                'id_user' => $userId,
                'id_perusahaan' => 0, // Atau ambil dari user table jika diperlukan
            ]));


            if (!empty($validated['attachments'])) {
                foreach ($validated['attachments'] as $attachment) {
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


            DB::commit();

            return response()->json([
                'message' => 'Data Customer berhasil dibuat!',
            ], 200);
        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan: ' . $th->getMessage()]);
        }

        // Customer::create($validated);

        // return redirect()->route('customer.index')->with('success', 'Data Customer berhasil dibuat!');
    }

    public function upload(Request $request)
    {
        $file = $request->file('file');

        // Buat nama file unik
        $filename = time() . '_' . $file->getClientOriginalName();

        // Simpan ke folder 'customers' di disk 'public'
        $path = $file->storeAs('customers', $filename, 'public');

        // URL akses publik
        $url = url(Storage::url($path)); // hasil: /storage/customers/filename.pdf

        return response()->json([
            'path' => $url,            // untuk diakses di frontend (misal window.open)
            'nama_file' => $filename,  // untuk ditampilkan di UI
        ]);
    }


    /**
     * Display the specified resource.
     */
    public function show(Customer $customer, $id)
    {
        $user = auth('web')->user();

        if (!$user->hasPermissionTo('view-master-customer')) {
            throw UnauthorizedException::forPermissions(['view-master-customer']);
        }

        // $ledger = PerkiraanJurnal::all();

        $payment = Customer::findOrFail($id);
        return Inertia::render('m_customer/table/view-data-form', [
            'customer' => $payment,
            // 'ledger' => $ledger,
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Customer $customer, $id)
    {
        $user = auth('web')->user();
        $payment = Customer::findOrFail($id);

        // Konversi tanggal ke format Y-m-d untuk perbandingan tanggal saja
        $createdDate = Carbon::parse($payment->created_at)->toDateString();
        $today = now()->toDateString();

        $canEditToday = $createdDate === $today && $user->hasPermissionTo('update-master-customer');
        $canReEdit = $user->hasPermissionTo('reupdate-master-customer');

        if (! $canEditToday && ! $canReEdit) {
            throw UnauthorizedException::forPermissions(['update-master-customer', 'reupdate-master-customer']);
        }

        // $ledger = PerkiraanJurnal::all();

        return Inertia::render('m_customer/table/edit-data-form', [
            'customer' => $payment,
            // 'ledger' => $ledger,
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Customer $customer, $id)
    {
        $user = auth('web')->user();
        $m_customer = Customer::findOrFail($id);

        // Konversi tanggal ke format Y-m-d untuk perbandingan tanggal saja
        $createdDate = Carbon::parse($m_customer->created_at)->toDateString();
        $today = now()->toDateString();

        $canEditToday = $createdDate === $today && $user->hasPermissionTo('update-master-customer');
        $canReEdit = $user->hasPermissionTo('reupdate-master-customer');

        if (! $canEditToday && ! $canReEdit) {
            throw UnauthorizedException::forPermissions(['update-master-customer', 'reupdate-master-customer']);
        }

        $validated = $request->validate([
            'nama_cust' => 'required',
            'no_npwp' => 'nullable',
            'alamat_npwp' => 'nullable',
            'alamat_penagihan' => 'nullable',
            'nama_pic' => 'nullable',
            'no_telp_pic' => 'nullable',
            'pph_info' => 'required',
            'user' => 'required',
            'ledger_id' => 'required'
        ]);

        $m_customer->update($validated);

        return redirect()->route('customer.index')->with('success', 'Data Customer berhasil diperbarui!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Customer $customer, $id)
    {
        $user = auth('web')->user();

        if (!$user->hasPermissionTo('delete-master-customer')) {
            throw UnauthorizedException::forPermissions(['delete-master-customer']);
        }

        $orderCustomer = Customer::findOrFail($id);

        try {
            DB::beginTransaction();

            // Soft delete data m_supplier
            $orderCustomer->delete();

            DB::commit();

            return redirect()->route('customer.index')
                ->with('success', 'Data Customer berhasil dihapus!');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->route('customer.index')
                ->with('error', 'Gagal menghapus Data Customer: ' . $e->getMessage());
        }
    }

    public function generatePdf($id)
    {
        $customer = Customer::with('attachments')->findOrFail($id);
        $user = auth('web')->user();

        return Pdf::view('pdf.customer', [
            'customer' => $customer,
            'generated_by' => $user?->name ?? 'Guest',
        ])
            ->format('a4')
            ->name('customer_' . $customer->id . '.pdf')
            ->withBrowsershot(function (\Spatie\Browsershot\Browsershot $browsershot) {
                $browsershot
                    ->setNodeBinary('C:/Program Files/nodejs/node.exe')
                    ->setChromePath('C:/Program Files/Google/Chrome/Application/chrome.exe')
                    ->noSandbox();
            })
            ->download();
    }

    public function showPublicForm($token)
    {
        // Cari berdasarkan kolom 'token' (bukan 'link_customer')
        $link = CustomerLink::where('token', $token)->first();

        if (!$link) {
            abort(404, 'Link tidak valid atau sudah tidak tersedia.');
        }

        return inertia('m_customer/table/public-data-form', [
            'customer_name' => $link->nama_customer,
            'token' => $token,
            'user_id' => $link->id_user,
        ]);
    }

    public function submitPublicForm(Request $request, $token)
    {
        $link = CustomerLink::where('token', $token)->first();

        if (!$link) {
            abort(404, 'Token tidak ditemukan');
        }

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
            // tambahkan jika perlu: no_telp, website, dsb
        ]);

        $customer = Customer::create([
            ...$validated,
            'id_user' => $link->id_user, // foreign key dari pembuat link
            'id_perusahaan' => $link->id_perusahaan ?? null, // jika kamu punya kolom ini
        ]);

        // Opsional: Hapus link agar tidak bisa dipakai ulang
        // $link->delete();

        return redirect('/')->with('success', 'Data berhasil dikirim.');
    }
}
