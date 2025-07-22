/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Auth } from '@/types';
import { Dialog } from '@headlessui/react';
import axios from 'axios';
import { Copy } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useState } from 'react';

export default function CustomerFormGenerate({ auth }: { auth: Auth }) {
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(true);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');

    const handleSubmitName = async () => {
        if (!customerName.trim()) {
            alert('Nama customer tidak boleh kosong.');
            return;
        }

        const token = nanoid(12); // Token lokal, bisa digenerate di frontend

        try {
            const res = await axios.post(route('customer-links.store'), {
                nama_customer: customerName,
                token, // ✅ kirim token ke backend
            });

            setGeneratedLink(res.data.link);
            setIsNameDialogOpen(false);
            setIsLinkDialogOpen(true);
        } catch (error: any) {
            console.error('Gagal membuat link:', error);
            alert(error?.response?.data?.message ?? 'Terjadi kesalahan saat membuat link.');
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(generatedLink);
        alert('Link disalin ke clipboard!');
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white">
            <h1 className="mb-4 text-2xl font-bold">Formulir Kesepakatan</h1>
            <p className="mb-2">Silakan isi nama customer untuk membagikan link formulir.</p>

            {/* Dialog input nama */}
            <Dialog open={isNameDialogOpen} onClose={() => {}} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center">
                    <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 text-black shadow-lg">
                        <Dialog.Title className="mb-4 text-lg font-semibold">Masukkan Nama Customer</Dialog.Title>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Contoh: Budi Santoso"
                            className="mb-4 w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button onClick={handleSubmitName} className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700">
                            Submit
                        </button>
                    </Dialog.Panel>
                </div>
            </Dialog>

            {/* Dialog tampilkan link */}
            <Dialog open={isLinkDialogOpen} onClose={() => {}} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center">
                    <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 text-black shadow-lg">
                        <Dialog.Title className="mb-2 text-lg font-semibold">Link Berhasil Dibuat</Dialog.Title>
                        <p className="mb-4 text-sm text-gray-600">Berikut adalah link untuk customer:</p>
                        <div className="mb-4 flex items-center justify-between rounded bg-gray-100 px-3 py-2">
                            <span className="truncate text-sm">{generatedLink}</span>
                            <button onClick={handleCopy} className="ml-4 text-blue-600 hover:text-blue-800">
                                <Copy className="h-5 w-5" />
                            </button>
                        </div>
                        <button onClick={() => setIsLinkDialogOpen(false)} className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700">
                            Tutup
                        </button>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    );
}
