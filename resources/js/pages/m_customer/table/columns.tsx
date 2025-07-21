/* eslint-disable react-hooks/rules-of-hooks */
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MasterCustomer } from '@/types';
import { Link, usePage } from '@inertiajs/react';
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

export const columns = (): ColumnDef<MasterCustomer>[] => {
    const { props } = usePage();
    const userRole = props.auth?.user?.roles?.[0]?.name ?? '';

    if (typeof window !== 'undefined') {
        const hasReloaded = localStorage.getItem('hasReloadedCustomerPage');

        if (!hasReloaded) {
            localStorage.setItem('hasReloadedCustomerPage', 'true');
            window.location.reload();
        }
    }
    return [
        {
            accessorKey: 'nama_perusahaan',
            header: () => <div className="px-2 py-2">Nama Perusahaan</div>,
            cell: ({ row }) => <div className="px-2 py-2">{row.original.nama_perusahaan}</div>,
        },
        {
            accessorKey: 'nama_user',
            header: 'User',
            cell: ({ row }) => <div className="px-0">{row.original.creator?.name || ''}</div>,
        },
        {
            accessorKey: 'no_telp_pic',
            header: 'No Telp PIC',
            cell: ({ row }) => <div className="px-0">{row.original.no_telp_personal || '-'}</div>,
        },
        {
            accessorKey: 'tanggal_status',
            header: 'Tanggal Status',
            cell: ({ row }) => {
                const tanggal = row.original.tanggal_status;
                const label = row.original.status_label;
                const nama_user = row.original.nama_user;

                if (!tanggal && !label) return '-';

                const isInput = label === 'diinput';

                return (
                    <span>
                        {label}
                        {!isInput && nama_user ? ` oleh ` : ' '}
                        {!isInput && nama_user && <strong>{nama_user}</strong>}
                        {' pada tanggal '}
                        <strong>
                            {new Date(tanggal).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </strong>
                    </span>
                );
            },
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
                            {userRole === 'user' && supplier.submit_1_timestamps === null && (
                                <Link href={`/customer/${supplier.id}/edit`}>
                                    <DropdownMenuItem>Edit Customer</DropdownMenuItem>
                                </Link>
                            )}
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
};
