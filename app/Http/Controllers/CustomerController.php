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
}
