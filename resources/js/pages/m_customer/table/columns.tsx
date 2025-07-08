import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MasterCustomer } from '@/types';
import { Link } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

export const columns = (onDeleteClick: (id: number) => void): ColumnDef<MasterCustomer>[] => [
    {
        accessorKey: 'no_npwp',
        header: 'Nomor NPWP',
        cell: ({ row }) => <div className="px-4 py-2">{row.original.no_npwp}</div>,
    },
    {
        accessorKey: 'nama_cust',
        header: 'Nama Customer',
        cell: ({ row }) => <div className="px-4 py-2">{row.original.nama_cust}</div>,
    },
    {
        accessorKey: 'no_telp_pic',
        header: 'No Telp PIC',
        cell: ({ row }) => <div className="px-4 py-2">{row.original.no_telp_pic || '-'}</div>,
    },
    {
        accessorKey: 'pph_info',
        header: 'PPH Info',
        cell: ({ row }) => <div className="px-4 py-2">{row.original.pph_info ? 'Yes' : 'No'}</div>,
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const supplier = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <Link href={`/customer/${supplier.id}`}>
                            <DropdownMenuItem>View Customer</DropdownMenuItem>
                        </Link>
                        <Link href={`/customer/${supplier.id}/edit`}>
                            <DropdownMenuItem>Edit Customer</DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem onClick={() => onDeleteClick(supplier.id)}>Delete Customer</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
