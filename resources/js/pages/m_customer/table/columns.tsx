import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MasterCustomer } from '@/types';
import { Link } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

const downloadPdf = async (id: number) => {
    const response = await fetch(`/customer/${id}/pdf`, {
        method: 'GET',
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `customer_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const columns = (): ColumnDef<MasterCustomer>[] => [
    {
        accessorKey: 'no_npwp',
        header: 'Nomor NPWP',
        cell: ({ row }) => <div className="px-4 py-2">{row.original.no_npwp}</div>,
    },
    {
        accessorKey: 'nama_perusahaan',
        header: 'Nama Customer',
        cell: ({ row }) => <div className="px-4 py-2">{row.original.nama_perusahaan}</div>,
    },
    {
        accessorKey: 'no_telp_pic',
        header: 'No Telp PIC',
        cell: ({ row }) => <div className="px-4 py-2">{row.original.no_telp_personal || '-'}</div>,
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <div className="px-4 py-2">{row.original.email_personal}</div>,
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
                        <Link href={`/customer/${supplier.id}/pdf`}>
                            <DropdownMenuItem onClick={() => supplier.id != null && downloadPdf(supplier.id)}>Download PDF</DropdownMenuItem>
                        </Link>
                        {/* <DropdownMenuItem onClick={() => onDeleteClick(supplier.id)}>Delete Customer</DropdownMenuItem> */}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
