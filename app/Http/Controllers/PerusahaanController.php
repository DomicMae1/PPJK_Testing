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

        // Hanya izinkan akses jika user memiliki role 'admin'
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

        // Ambil hanya field yang ada di tabel perusahaan
        $perusahaanData = collect($validated)->only([
            'nama_perusahaan',
            'notify_1',
            'notify_2'
        ])->toArray();

        // Buat perusahaan
        $perusahaan = Perusahaan::create($perusahaanData);

        // Assign users ke perusahaan melalui pivot
        $userRoles = [
            $validated['id_User_1'] ?? null => 'manager',
            $validated['id_User_2'] ?? null => 'direktur',
            $validated['id_User_3'] ?? null => 'lawyer',
        ];

        foreach ($userRoles as $userId => $role) {
            if ($userId) {
                $perusahaan->users()->attach($userId, ['role' => $role]);
            }
        }

        // Assign user pembuat jika ada
        if (!empty($validated['id_User'])) {
            $perusahaan->users()->attach($validated['id_User'], ['role' => 'creator']);
        }

        return response()->json([
            'message' => 'Perusahaan berhasil ditambahkan',
            'data' => $perusahaan->load('users'),
        ], 201);
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
            'id_User_1' => 'nullable|integer|exists:users,id',
            'id_User_2' => 'nullable|integer|exists:users,id',
            'id_User_3' => 'nullable|integer|exists:users,id',
            'id_User' => 'nullable|integer|exists:users,id',
            'notify_1' => 'nullable|string',
            'notify_2' => 'nullable|string',
        ]);

        $perusahaan->update($validated);

        // Sync ulang user-role
        $userRoles = [
            $validated['id_User_1'] => 'manager',
            $validated['id_User_2'] => 'direktur',
            $validated['id_User_3'] => 'lawyer',
        ];

        // Hapus role-role lama dan sync ulang
        $syncData = [];
        foreach ($userRoles as $userId => $role) {
            if ($userId) {
                $syncData[$userId] = ['role' => $role];
            }
        }
        if (!empty($validated['id_User'])) {
            $syncData[$validated['id_User']] = ['role' => 'creator'];
        }

        $perusahaan->users()->sync($syncData);

        return response()->json([
            'message' => 'Perusahaan berhasil diperbarui',
            'data' => $perusahaan->load('users'),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Perusahaan $perusahaan)
    {
        $perusahaan->users()->detach();
        $perusahaan->delete();

        return response()->json([
            'message' => 'Perusahaan berhasil dihapus',
        ]);
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
