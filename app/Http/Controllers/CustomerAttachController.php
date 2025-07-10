<?php

namespace App\Http\Controllers;

use App\Models\CustomerAttach;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CustomerAttachController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $attachments = CustomerAttach::with('customer')->latest()->get();
        return response()->json($attachments);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create() {}

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'nama_file'   => 'required|string|max:255',
            'type'        => 'required|in:npwp,sppkp,ktp',
            'file'        => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $path = $request->file('file')->store('uploads/customer_attaches', 'public');

        $attachment = CustomerAttach::create([
            'customer_id' => $request->customer_id,
            'nama_file'   => $request->nama_file,
            'path'        => $path,
            'type'        => $request->type,
        ]);

        return response()->json(['message' => 'Lampiran berhasil ditambahkan', 'data' => $attachment], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(CustomerAttach $customerAttach)
    {
        // 
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(CustomerAttach $customerAttach)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CustomerAttach $customerAttach)
    {
        $request->validate([
            'nama_file' => 'sometimes|required|string|max:255',
            'type'      => 'sometimes|required|in:npwp,sppkp,ktp',
            'file'      => 'sometimes|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        if ($request->hasFile('file')) {
            // Hapus file lama
            if ($customerAttach->path && Storage::disk('public')->exists($customerAttach->path)) {
                Storage::disk('public')->delete($customerAttach->path);
            }

            // Simpan file baru
            $customerAttach->path = $request->file('file')->store('uploads/customer_attaches', 'public');
        }

        $customerAttach->nama_file = $request->get('nama_file', $customerAttach->nama_file);
        $customerAttach->type      = $request->get('type', $customerAttach->type);
        $customerAttach->save();

        return response()->json(['message' => 'Lampiran berhasil diperbarui', 'data' => $customerAttach]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(CustomerAttach $customerAttach)
    {
        //
    }
}
