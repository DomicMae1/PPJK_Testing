<?php

namespace App\Http\Controllers;

use App\Models\CustomerLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Spatie\Permission\Exceptions\UnauthorizedException;

class CustomerLinkController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
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
        $user = auth('web')->user();

        if (!$user->hasPermissionTo('view-master-customer')) {
            throw UnauthorizedException::forPermissions(['view-master-customer']);
        }

        $validated = $request->validate([
            'nama_customer' => 'required|string|max:255',
            'token' => 'nullable|string|max:255|unique:customer_links,token', // token dari frontend jika ada
        ]);

        $token = $validated['token'] ?? Str::random(12); // fallback jika tidak dikirim dari frontend

        $link = CustomerLink::create([
            'id_user' => $user->id,
            'nama_customer' => $validated['nama_customer'],
            'token' => $token,
        ]);

        return response()->json([
            'link' => url("/form/{$token}"),
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(CustomerLink $customerLink)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(CustomerLink $customerLink)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CustomerLink $customerLink)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(CustomerLink $customerLink)
    {
        //
    }
}
