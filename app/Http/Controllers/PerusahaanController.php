<?php

namespace App\Http\Controllers;

use App\Models\Perusahaan;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class PerusahaanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();

        if (!$user->hasRole('admin')) {
            abort(403, 'Unauthorized access. Only admin can access this page.');
        }

        $perusahaans = Perusahaan::with(['user', 'users'])->get();
        $users = User::select('id', 'name')->get();

        return Inertia::render('company/page', [
            'companies' => $perusahaans,
            'users' => $users,
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
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'id_User_1' => 'nullable|integer|exists:users,id',
            'id_User_2' => 'nullable|integer|exists:users,id',
            'id_User_3' => 'nullable|integer|exists:users,id',
            'id_User' => 'nullable|integer|exists:users,id',
            'notify_1' => 'nullable|string',
            'notify_2' => 'nullable|string',
        ]);

        $perusahaanData = collect($validated)->only([
            'nama_perusahaan',
            'notify_1',
            'notify_2'
        ])->toArray();

        $perusahaan = Perusahaan::create($perusahaanData);

        $userRoles = [
            $validated['id_User_1'] ?? null => 'manager',
            $validated['id_User_2'] ?? null => 'direktur',
            $validated['id_User_3'] ?? null => 'lawyer',
            $validated['id_User']   ?? null => 'user', 
        ];

        foreach ($userRoles as $userId => $role) {
            if ($userId) {
                $perusahaan->users()->attach($userId, ['role' => $role]);

                 User::where('id', $userId)->update([
                'id_perusahaan' => $perusahaan->id
            ]);
            }
        }

        return back()->with('success', 'Perusahaan berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Perusahaan $perusahaan)
    {
        return response()->json([
            'data' => $perusahaan->load(['user', 'users']),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Perusahaan $perusahaan)
    {
        return response()->json([
            'data' => $perusahaan->load('users'),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Perusahaan $perusahaan)
    {
        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'id_User'   => 'nullable|integer|exists:users,id',   
            'id_User_1' => 'nullable|integer|exists:users,id', 
            'id_User_2' => 'nullable|integer|exists:users,id', 
            'id_User_3' => 'nullable|integer|exists:users,id', 
            'notify_1'  => 'nullable|string',
            'notify_2'  => 'nullable|string',
        ]);

        $perusahaan->update([
            'nama_perusahaan' => $validated['nama_perusahaan'],
            'notify_1'        => $validated['notify_1'] ?? null,
            'notify_2'        => $validated['notify_2'] ?? null,
        ]);

        $syncData = [];

        if (!empty($validated['id_User'])) {
            $syncData[$validated['id_User']] = ['role' => 'user']; 
        }
        if (!empty($validated['id_User_1'])) {
            $syncData[$validated['id_User_1']] = ['role' => 'manager'];
        }
        if (!empty($validated['id_User_2'])) {
            $syncData[$validated['id_User_2']] = ['role' => 'direktur'];
        }
        if (!empty($validated['id_User_3'])) {
            $syncData[$validated['id_User_3']] = ['role' => 'lawyer'];
        }

        $perusahaan->users()->sync($syncData);

        return redirect()
            ->back()
            ->with('success', 'Perusahaan berhasil diedit');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Perusahaan $perusahaan)
    {
        $perusahaan->users()->detach();

        $perusahaan->delete();

        return redirect()
            ->back()
            ->with('success', 'Perusahaan berhasil dihapus');
    }

    public function checkManagerExistence($idPerusahaan)
    {
        $perusahaan = Perusahaan::with(['users' => function ($query) {
            $query->wherePivot('role', 'manager');
        }])->find($idPerusahaan);

        return response()->json([
            'manager_exists' => $perusahaan && $perusahaan->users->isNotEmpty(),
        ]);
    }
}
