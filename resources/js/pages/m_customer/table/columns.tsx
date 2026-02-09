/* eslint-disable @typescript-eslint/no-explicit-any */
// m_customer/table/columns.tsx

import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { FileDown, Pencil, Trash2 } from 'lucide-react';
// Pastikan path import Customer benar.
// Jika terjadi circular dependency, pindahkan interface Customer ke @/types/index.ts
import { Customer } from '../page';

// PERBAIKAN: Ubah parameter callback menjadi (customer: Customer) bukan (id: number)
export const columns = (onEditClick: (customer: Customer) => void, onDeleteClick: (customer: Customer) => void): ColumnDef<Customer>[] => {
    const onGeneratePdf = (id: number) => {
        // Asumsi route 'customer.generate-pdf' sudah ada di Laravel
        window.open(route('customer.generate-pdf', id), '_blank');
    };

    return [
        {
            accessorKey: 'nama_perusahaan',
            header: 'Nama Perusahaan',
        },
        {
            accessorKey: 'type',
            header: 'Tipe',
            cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
        },
        {
            accessorKey: 'email',
            header: 'Email',
        },
        {
            // Note: Pastikan field 'no_telp' ada di response controller/model
            // Jika tidak ada, ini akan selalu menampilkan '-'
            accessorKey: 'no_telp',
            header: 'No. Telp',
            cell: ({ row }) => (row.original as any).no_telp || '-',
        },
        {
            // Note: Pastikan field 'kota' ada di response controller/model
            accessorKey: 'kota',
            header: 'Kota',
            cell: ({ row }) => row.original.kota || '-',
        },
        {
            id: 'actions',
            header: 'Aksi',
            cell: ({ row }) => {
                const customer = row.original;
                // Ambil ID yang benar (id_customer)
                const validId = customer.id_customer || customer.id;

                return (
                    <div className="flex items-center gap-2">
                        {/* Tombol PDF */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => validId && onGeneratePdf(validId)}
                            title="Download PDF"
                        >
                            <FileDown className="h-4 w-4" />
                        </Button>

                        {/* Tombol Edit */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-orange-200 text-orange-600 hover:bg-orange-50"
                            onClick={() => onEditClick(customer)}
                            title="Edit Data"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Tombol Delete */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => onDeleteClick(customer)}
                            title="Hapus Data"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];
};
