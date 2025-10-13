<?php

namespace App\Http\Controllers;

use App\Models\CustomerLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
        $role = $user->roles->first()?->name ?? null;

        Log::info('Request input:', $request->all());
        Log::info('User info:', ['id' => $user->id, 'role' => $role, 'id_perusahaan' => $user->id_perusahaan ?? 'null']);


        $validated = $request->validate([
            'nama_customer' => 'required|string|max:255',
            'token' => 'nullable|string|max:255|unique:customer_links,token',
            'id_perusahaan' => 'nullable|integer',
        ]);

        $token = $validated['token'] ?? Str::random(12);
        $generatedUrl = url("/form/{$token}");


        $id_perusahaan = null;

        if ($role === 'user') {
            $id_perusahaan = $user->id_perusahaan;
            if (!$id_perusahaan) {
                return response()->json(['message' => 'User tidak memiliki ID perusahaan.'], 422);
            }
        } elseif (in_array($role, ['manager', 'direktur'])) {
            if (!$request->id_perusahaan) {
                return response()->json(['message' => 'ID perusahaan wajib diisi untuk manager/direktur.'], 422);
            }

            $perusahaanId = $request->id_perusahaan;

            $hasAccess = DB::table('perusahaan_user_roles')
                ->where('user_id', $user->id)
                ->where('id_perusahaan', $perusahaanId)
                ->exists();

            if (!$hasAccess) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke perusahaan tersebut.'], 403);
            }

            $id_perusahaan = $perusahaanId;
        } else {
            return response()->json(['message' => 'Role pengguna tidak valid.'], 403);
        }

        if (!$id_perusahaan) {
            return response()->json(['message' => 'Gagal menentukan ID perusahaan.'], 500);
        }

        $link = CustomerLink::create([
            'id_user' => $user->id,
            'nama_customer' => $validated['nama_customer'],
            'token' => $token,
            'url' => $generatedUrl,
            'id_perusahaan' => $id_perusahaan,
        ]);

        return response()->json([
            'link' => $generatedUrl,
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
