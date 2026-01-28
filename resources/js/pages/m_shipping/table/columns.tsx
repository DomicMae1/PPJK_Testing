import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Link, usePage } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, MoreHorizontal } from 'lucide-react';

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
    deadline_date?: string | null;
};

export const columns = (
    trans: Record<string, string>, // <--- INI PENTING
    onDeleteClick?: (shipping: Shipping) => void,
): ColumnDef<Shipping>[] => {
    if (typeof window !== 'undefined') {
        const hasReloaded = localStorage.getItem('hasReloadedCustomerPage');

        if (!hasReloaded) {
            localStorage.setItem('hasReloadedCustomerPage', 'true');
            window.location.reload();
        }
    }

    return [
        {
            accessorKey: 'spk_code',
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {/* 2. Gunakan trans */}
                    {trans.spk_number}
                </div>
            ),
            cell: ({ row }) => <div className="text-sm font-bold md:min-w-[150px] md:truncate md:px-2 md:py-2">{row.original.spk_code ?? '-'}</div>,
        },
        {
            accessorKey: 'nama_customer',
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {/* 2. Gunakan trans */}
                    {trans.customer_name}
                </div>
            ),
            cell: ({ row }) => <div className="text-sm md:min-w-[150px] md:truncate md:px-2">{row.original.nama_customer || '-'}</div>,
        },
        {
            accessorKey: 'keterangan_status',
            accessorFn: (row) => {
                return {
                    sort: row.tanggal_status ? new Date(row.tanggal_status).getTime() : 0,
                    label: row.status_label ?? null,
                };
            },
            // 2. Gunakan trans
            header: ({ column }) => <div className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2">{trans.status_description}</div>,
            cell: ({ row }) => {
                const tanggal = row.original.tanggal_status;
                const label = row.original.status_label;
                const nama_user = row.original.nama_user;

                if (!tanggal) return <div className="text-sm">-</div>;

                const dateObj = new Date(tanggal);

                // Gunakan locale dari usePage jika ingin format tanggal ikut berubah (opsional)
                // Tapi format 'id-ID' biasanya standar di Indonesia meski UI Inggris
                const tanggalFormat = dateObj
                    .toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    })
                    .replace(/\./g, '/');

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
                            {/* 2. Gunakan trans untuk kata sambung */}
                            {nama_user ? ` ${trans.by} ` : ' '}
                            {nama_user && <strong>{nama_user}</strong>}
                            {` ${trans.at} `}
                            <strong>{`${tanggalFormat} ${jamMenit} WIB`}</strong>
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'deadline_date',
            header: () => <div className="text-sm font-medium md:px-2 md:py-2">{trans.deadline}</div>,
            cell: ({ row }) => {
                const deadline = row.original.deadline_date;
                // Ambil data user dari usePage() di dalam cell render (aman)
                const { props } = usePage();
                const auth = props.auth as any;
                const isUserExternal = auth.user?.role === 'eksternal';
                const currentLocale = props.locale as string;

                if (!deadline) {
                    return <div className="text-sm md:px-2">-</div>;
                }

                return (
                    <div className="flex flex-col justify-center md:min-w-[200px] md:px-2">
                        {/* Tampilkan Warning Merah (Khusus External) */}
                        {isUserExternal && (
                            <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-3 w-3" />
                                <span className="mt-0.5 flex text-xs font-bold">
                                    {trans.submit_before}{' '}
                                    {new Date(deadline).toLocaleDateString(currentLocale === 'id' ? 'id-ID' : 'en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: '2-digit',
                                    })}{' '}
                                    {trans.wib}
                                </span>
                            </div>
                        )}

                        {!isUserExternal && <div className="text-xs font-bold">-</div>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'jalur',
            // 2. Gunakan trans
            header: () => <div className="text-sm font-medium md:px-2 md:py-2">{trans.channel}</div>,
            cell: ({ row }) => {
                const jalur = row.original.jalur;
                let colorClass = 'text-gray-500';
                let displayText = '-';
                const jalurLower = jalur ? jalur.toLowerCase() : '';

                if (jalurLower === 'hijau') {
                    colorClass = 'text-green-600';
                    displayText = trans.green; // Translate: Hijau/Green
                } else if (jalurLower === 'merah') {
                    colorClass = 'text-red-600';
                    displayText = trans.red; // Translate: Merah/Red
                } else if (jalurLower === 'kuning') {
                    colorClass = 'text-yellow-600';
                    displayText = trans.yellow; // Translate: Kuning/Yellow
                }

                return <div className={`text-sm font-bold ${colorClass} md:min-w-[100px] md:px-2`}>{displayText}</div>;
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right text-sm font-medium md:px-2 md:py-2"></div>,
            cell: ({ row }) => {
                const shipping = row.original;
                const { auth } = usePage().props as any; // Cast any agar tidak merah
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
                                        {/* 2. Gunakan trans */}
                                        <DropdownMenuItem>{trans.view_customer}</DropdownMenuItem>
                                    </Link>

                                    {isAdmin && (
                                        <DropdownMenuItem
                                            className="cursor-pointer text-red-600"
                                            asChild
                                            onClick={(e) => {
                                                const confirmed = window.confirm(trans.delete_confirm_alert);
                                                if (!confirmed) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        >
                                            <Link
                                                href={`/shipping/${shipping.id}`}
                                                method="delete"
                                                as="button"
                                                onSuccess={() => window.alert(trans.delete_success_alert)}
                                            >
                                                {trans.delete_customer}
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
                                {trans.view_customer}
                            </Button>
                        </Link>

                        {isAdmin && (
                            <Button
                                className="cursor-pointer bg-red-500 text-white"
                                asChild
                                onClick={(e) => {
                                    const confirmed = window.confirm(trans.delete_confirm_alert);
                                    if (!confirmed) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <Link
                                    href={`/shipping/${shipping.id}`}
                                    method="delete"
                                    as="button"
                                    onSuccess={() => window.alert(trans.delete_success_alert)}
                                >
                                    {trans.delete_customer}
                                </Link>
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];
};
