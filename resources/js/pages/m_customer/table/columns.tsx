/* eslint-disable react-hooks/rules-of-hooks */
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/use-media-query';
import { MasterCustomer } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

const downloadPdf = (id: number) => {
    const link = document.createElement('a');
    link.href = `/customer/${id}/pdf`;
    link.setAttribute('download', `customer_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const columns = (): ColumnDef<MasterCustomer>[] => {
    const { props } = usePage();
    console.log('Tes', usePage().props);
    const userRole = props.auth?.user?.roles?.[0]?.name ?? '';
    console.log(userRole);

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
            header: ({ column }) => (
                <div className="px-2 py-2 text-sm font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Ownership {column.getIsSorted() === 'asc' ? ' 🔼' : column.getIsSorted() === 'desc' ? ' 🔽' : ''}
                </div>
            ),
            cell: ({ row }) => <div className="min-w-[150px] truncate px-2 py-2 text-sm">{row.original.nama_perusahaan ?? '-'}</div>,
        },
        {
            accessorKey: 'creator_name',
            header: 'Disubmit oleh',
            cell: ({ row }) => <div className="min-w-[120px] truncate px-2 text-sm">{row.original.creator_name || '-'}</div>,
        },
        {
            accessorKey: 'nama_customer',
            header: ({ column }) => (
                <div
                    className="cursor-pointer px-2 py-2 text-sm font-medium select-none"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Nama Customer
                    {column.getIsSorted() === 'asc' ? ' 🔼' : column.getIsSorted() === 'desc' ? ' 🔽' : ''}
                </div>
            ),
            cell: ({ row }) => <div className="min-w-[150px] truncate px-2 text-sm">{row.original.nama_customer || '-'}</div>,
            enableSorting: true,
        },
        {
            accessorKey: 'no_telp_pic',
            header: 'No Telp PIC',
            cell: ({ row }) => <div className="min-w-[120px] truncate px-2 text-sm">{row.original.no_telp_personal || '-'}</div>,
        },
        {
            accessorKey: 'keterangan_status',
            header: 'Keterangan Status',
            cell: ({ row }) => {
                const tanggal = row.original.tanggal_status;
                const label = row.original.status_label;
                const nama_user = row.original.nama_user;

                if (!tanggal && !label) return '-';

                const isInput = label === 'diinput';

                return (
                    <div className="min-w-[200px] truncate px-2 text-sm">
                        <span>
                            {label}
                            {!isInput && nama_user ? ` oleh ` : ' '}
                            {!isInput && nama_user && <strong>{nama_user}</strong>}
                            {' pada '}
                            <strong>
                                {new Date(tanggal).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </strong>
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status?.toLowerCase();
                let displayText = '-';
                let textColor = 'text-muted-foreground';

                if (status === 'rejected') {
                    displayText = 'Bermasalah';
                    textColor = 'text-red-600';
                } else if (status === 'approved') {
                    displayText = 'Aman';
                    textColor = 'text-green-600';
                } else if (status) {
                    displayText = status;
                }

                return <div className={`min-w-[100px] px-2 text-sm font-semibold ${textColor}`}>{displayText}</div>;
            },
        },
        {
            accessorKey: 'status_2_timestamps',
            header: '',
            cell: () => null,
            enableHiding: true,
            filterFn: (row, columnId, filterValue) => {
                const raw = row.getValue(columnId);

                // Normalisasi: jadikan null jika value kosong string, string 'null', atau undefined
                const value = raw === null || raw === undefined || raw === '' || raw === 'null' ? null : raw;

                if (filterValue === 'sudah') return value !== null;
                if (filterValue === 'belum') return value === null;
                return true;
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const customer = row.original;
                const { auth } = usePage().props as { auth: Auth };
                const currentUser = auth.user;

                // Ambil role user yang sedang login
                const currentUserRole = currentUser.roles?.[0]?.name;

                // 👇 LOGIKA BARU YANG LEBIH ANDAL
                const canEdit =
                    !customer.submit_1_timestamps && // 1. Belum pernah disubmit
                    (customer.user_id === currentUser.id || // 2. Dibuat oleh user yang sama (jika user_id ada)
                        (customer.creator?.role && currentUserRole && customer.creator.role === currentUserRole)); // ATAU role creator sama dengan role user saat ini

                const isDesktop = useMediaQuery('(min-width: 768px)');

                if (isDesktop) {
                    return (
                        <div className="flex justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Buka menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <Link href={`/customer/${customer.id}`}>
                                        <DropdownMenuItem>View Customer</DropdownMenuItem>
                                    </Link>

                                    {/* Tombol Edit hanya muncul jika 'canEdit' true */}
                                    {canEdit && (
                                        <Link href={`/customer/${customer.id}/edit`}>
                                            <DropdownMenuItem>Edit Customer</DropdownMenuItem>
                                        </Link>
                                    )}

                                    <DropdownMenuItem onClick={() => customer.id != null && downloadPdf(customer.id)}>Download PDF</DropdownMenuItem>

                                    {/* Tombol Hapus sekarang selalu muncul */}
                                    <Link
                                        href={`/customer/${customer.id}`} // URL diperbaiki (tanpa /destroy)
                                        method="delete" // Mengirim sebagai request DELETE
                                        as="button" // Penting agar tetap berfungsi seperti tombol
                                        className="w-full text-left"
                                    >
                                        <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                                            Hapus Customer
                                        </DropdownMenuItem>
                                    </Link>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                }

                // Tampilan Mobile/Tablet (Drawer)
                return (
                    <div className="flex justify-end">
                        <Drawer>
                            <DrawerTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Buka menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                                <DrawerHeader className="text-left">
                                    <DrawerTitle>Actions</DrawerTitle>
                                    <DrawerDescription>Pilih aksi yang ingin Anda lakukan.</DrawerDescription>
                                </DrawerHeader>
                                <div className="flex flex-col gap-2 p-4">
                                    <Link href={`/customer/${customer.id}`}>
                                        <Button variant="outline" className="w-full justify-start">
                                            View Customer
                                        </Button>
                                    </Link>
                                    {canEdit && (
                                        <Link href={`/customer/${customer.id}/edit`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Edit Customer
                                            </Button>
                                        </Link>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => customer.id != null && downloadPdf(customer.id)}
                                    >
                                        Download PDF
                                    </Button>
                                    {/* Tombol Hapus sekarang selalu muncul */}
                                    <Link
                                        href={`/customer/${customer.id}`} // URL diperbaiki
                                        method="delete" // Mengirim sebagai request DELETE
                                        as="button" // Bertindak sebagai tombol
                                    >
                                        <Button variant="destructive" className="w-full justify-start text-white">
                                            Hapus Customer
                                        </Button>
                                    </Link>
                                </div>
                                <DrawerFooter className="pt-2">
                                    <DrawerClose asChild>
                                        <Button variant="outline">Batal</Button>
                                    </DrawerClose>
                                </DrawerFooter>
                            </DrawerContent>
                        </Drawer>
                    </div>
                );
            },
        },
    ];
};
