<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Perusahaan;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();

        $usersQuery = User::with(['role_internal', 'roles']);
    
        $companyQuery = Perusahaan::select(['id_perusahaan as id', 'nama_perusahaan']);

        if ($user->hasRole('admin')) {
        } 
        elseif ($user->hasRole(['manager', 'supervisor'])) {
            $usersQuery->where('id_perusahaan', $user->id_perusahaan);

            $companyQuery->where('id_perusahaan', $user->id_perusahaan);
        }
        else {
            $usersQuery->where('id_perusahaan', $user->id_perusahaan);
        }

        $users = $usersQuery->get();
        $roles = Role::all(['id', 'name']);
        $perusahaan = $companyQuery->get();
        
        $customers = Customer::select(['id_customer as id', 'nama_perusahaan'])->where('ownership', $user->id_perusahaan)->get();

        return Inertia::render('auth/page', [
            'users' => $users,
            'roles' => $roles,
            'companies' => $perusahaan,
            'customers' => $customers,
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
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|string|exists:roles,name', 
            'user_type' => 'required|string|max:255',
            'id_perusahaan' => 'nullable|exists:perusahaan,id_perusahaan',
            'id_customer' => 'nullable|exists:customers,id_customer',
        ]);

        // 1. Normalisasi 'role' (User Type)
        $userType = $request->user_type;
        if ($userType === 'external') {
            $userType = 'eksternal'; // Ubah ke Bahasa Indonesia sesuai Constraint Database
        }

        // 2. Tentukan Logic role_internal
        $roleInternal = null;
        if ($userType === 'internal') {
            $roleInternal = $request->role; 
        }
        // Jika eksternal, $roleInternal tetap null (sesuai aturan database)

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            
            // --- PERBAIKAN DISINI ---
            // Gunanakan variabel yang sudah diolah ($userType), JANGAN $request->user_type
            'role' => $userType, 
            
            // Gunakan variabel yang sudah diolah ($roleInternal), JANGAN $request->role
            'role_internal' => $roleInternal, 
            
            'id_perusahaan' => $request->id_perusahaan,
            'id_customer' => $request->id_customer,
        ]);

        // 4. Assign Role Spatie
        $user->assignRole($request->role);

        return redirect()->route('users.index')->with('message', 'User created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users,email,' . $user->id_user . ',id_user',
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'role_internal' => 'nullable|exists:roles,name', 
        ]);

        try {
            $data = [
                'name' => $request->name,
                'email' => $request->email,
            ];

            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }

            if ($user->role === 'internal') {
                if ($request->filled('role_internal')) {
                    $data['role_internal'] = $request->role_internal;
                    $user->syncRoles($request->role_internal);
                }
            } 

            $user->update($data);

            return redirect()->route('users.index')->with('message', 'User updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to update user: ' . $e->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        $user->delete();
        return redirect()->route('users.index')->with('message', 'User deleted successfully.');
    }
}
