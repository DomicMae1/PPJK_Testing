<?php

namespace App\Http\Controllers;

use App\Models\Payments;
use App\Http\Requests\StorepaymentsRequest;
use App\Http\Requests\UpdatepaymentsRequest;
use Inertia\Inertia;

class PaymentsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $payments = Payments::all();

        return Inertia::render('payments/page', [
            'payments' => $payments
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('payments/add-page');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorepaymentsRequest $request)
    {
        $validatedData = $request->validated();

        Payments::create([
            'email' => $validatedData['email'],
            'amount' => intval(str_replace('.', '', $validatedData['amount'])),
            'status' => $validatedData['status'],
        ]);

        return redirect()->route('payments')->with('success', 'Payment successfully saved!');
    }

    /**
     * Display the specified resource.
     */
    public function show(payments $payments)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(payments $payments, $id)
    {
        $payment = Payments::findOrFail($id);
        return Inertia::render('payments/edit-page', [
            'payment' => $payment,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePaymentsRequest $request)
    {
        $payments = Payments::find($request->id);
        $payments->email = $request->email;
        $payments->amount = $request->amount;
        $payments->status = $request->status;
        $payments->save();

        return redirect()->route('payments')->with('success', 'Payment updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $payment = Payments::findOrFail($id);
        $payment->delete();

        return redirect()->route('payments')->with('success', 'Payment deleted successfully');
    }
}
