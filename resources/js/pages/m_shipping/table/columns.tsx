import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Link, usePage } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

// const downloadPdf = (id: number) => {
//     const link = document.createElement('a');
//     link.href = `/shipping/${id}/pdf`;
//     link.setAttribute('download', `customer_${id}.pdf`);
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
// };

export type Shipping = {
    id: string;
    spk_code: string;
    nama_customer: string;
    tanggal_status: string;
    status_label: string;
    nama_user: string;
    jalur: string;
};

export const columns = (onDeleteClick?: (shipping: Shipping) => void): ColumnDef<Shipping>[] => {
    if (typeof window !== 'undefined') {
        const hasReloaded = localStorage.getItem('hasReloadedCustomerPage');

        if (!hasReloaded) {
            localStorage.setItem('hasReloadedCustomerPage', 'true');
            window.location.reload();
        }
    }

    return [
        {
            // UBAH: Accessor sesuai data controller ('spk_code')
            accessorKey: 'spk_code',
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    SPK Number
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-sm font-bold md:min-w-[150px] md:truncate md:px-2 md:py-2">
                    {/* Tampilkan SPK Code */}
                    {row.original.spk_code ?? '-'}
                </div>
            ),
        },
        {
            // UBAH: Accessor untuk Nama Customer (Nama Perusahaan)
            accessorKey: 'nama_customer',
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Nama Customer
                </div>
            ),
            cell: ({ row }) => <div className="text-sm md:min-w-[150px] md:truncate md:px-2">{row.original.nama_customer || '-'}</div>,
        },
        {
            // LOGIC KETERANGAN STATUS (Tetap sama, mengambil dari created_at/tanggal_status)
            accessorKey: 'keterangan_status',
            accessorFn: (row) => {
                return {
                    sort: row.tanggal_status ? new Date(row.tanggal_status).getTime() : 0,
                    label: row.status_label ?? null,
                };
            },
            // ... (sortingFn dan filterFn tetap sama) ...
            header: ({ column }) => <div className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2">Keterangan Status</div>,
            cell: ({ row }) => {
                const tanggal = row.original.tanggal_status;
                const label = row.original.status_label;
                const nama_user = row.original.nama_user;

                if (!tanggal) return <div className="text-sm">-</div>;

                const dateObj = new Date(tanggal);
                // Format Tanggal: 12/11/2025
                const tanggalFormat = dateObj
                    .toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    })
                    .replace(/\./g, '/');

                // Format Jam: 17:14
                const jamMenit = dateObj
                    .toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    })
                    .replace('.', ':');

                return (
                    <div className="text-sm md:min-w-[200px] md:truncate md:px-2">
                        <span>
                            {label}
                            {nama_user ? ' oleh ' : ' '}
                            {nama_user && <strong>{nama_user}</strong>}
                            {' pada '}
                            <strong>{`${tanggalFormat} ${jamMenit} WIB`}</strong>
                        </span>
                    </div>
                );
            },
        },
        {
            // UBAH: Kolom Penjaluran (Default Jalur Hijau)
            accessorKey: 'jalur',
            header: () => <div className="text-sm font-medium md:px-2 md:py-2">Penjaluran</div>,
            cell: () => {
                // HARDCODE: Default Jalur Hijau text hijau
                return <div className="text-sm font-bold text-green-600 md:min-w-[100px] md:px-2">Jalur Hijau</div>;
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right text-sm font-medium md:px-2 md:py-2">{/* kosong agar align */}</div>,
            cell: ({ row }) => {
                const shipping = row.original;
                const { auth } = usePage().props;
                const currentUser = auth.user;

                const currentUserRole = currentUser.roles?.[0]?.name;
                const isAdmin = currentUserRole === 'admin';

                const isDesktop = useMediaQuery('(min-width: 768px)');

                if (isDesktop) {
                    return (
                        <div className="flex justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                    <Link href={`/shipping/${shipping.id}`} className="w-full cursor-pointer">
                                        <DropdownMenuItem>View Customer</DropdownMenuItem>
                                    </Link>

                                    {/* {canEdit && (
                                        <Link href={`/customer/${customer.id}/edit`}>
                                            <DropdownMenuItem>Edit Customer</DropdownMenuItem>
                                        </Link>
                                    )} */}

                                    {isAdmin && (
                                        <DropdownMenuItem
                                            className="cursor-pointer text-red-600"
                                            asChild
                                            onClick={(e) => {
                                                const confirmed = window.confirm('Apakah anda yakin ingin menghapus data tersebut?');
                                                if (!confirmed) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        >
                                            <Link
                                                href={`/shipping/${shipping.id}`}
                                                method="delete"
                                                as="button"
                                                onSuccess={() => window.alert('Data berhasil dihapus!')}
                                            >
                                                Hapus Customer
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col gap-2 pt-2">
                        <Link href={`/shipping/${shipping.id}`}>
                            <Button size="sm" variant="outline" className="w-full justify-center dark:border-white">
                                View Customer
                            </Button>
                        </Link>

                        {/* {canEdit && (
                            <Link href={`/customer/${customer.id}/edit`}>
                                <Button className="w-full justify-center">Edit Customer</Button>
                            </Link>
                        )} */}

                        {isAdmin && (
                            <Button
                                className="cursor-pointer bg-red-500 text-white"
                                asChild
                                onClick={(e) => {
                                    const confirmed = window.confirm('Apakah anda yakin ingin menghapus data tersebut?');
                                    if (!confirmed) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <Link
                                    href={`/shipping/${shipping.id}`}
                                    method="delete"
                                    as="button"
                                    onSuccess={() => window.alert('Data berhasil dihapus!')}
                                >
                                    Hapus Customer
                                </Link>
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];
};
