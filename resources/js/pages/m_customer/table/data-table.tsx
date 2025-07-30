/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // pastikan path sesuai
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, usePage } from '@inertiajs/react';
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from '@tanstack/react-table';
import axios from 'axios';
import { Copy } from 'lucide-react';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
    const { props } = usePage();
    const auth = props.auth || {};
    const userRole = auth.user?.roles?.[0]?.name ?? '';

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [statusFilter, setStatusFilter] = useState<'sudah' | 'belum' | ''>('');

    // State lokal untuk filter
    const [filterColumn, setFilterColumn] = useState<'nama_customer' | 'nama_user' | 'nama_perusahaan'>('nama_customer');
    const [filterValue, setFilterValue] = useState('');
    const [selectedPerusahaanId, setSelectedPerusahaanId] = useState<string>('');

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    // Sinkronkan filterValue dengan columnFilters
    useEffect(() => {
        const column = table.getColumn(filterColumn);
        if (column) {
            column.setFilterValue(filterValue);
        }
    }, [filterValue, filterColumn, table]);

    useEffect(() => {
        const column = table.getColumn('status_2_timestamps');
        if (!column) return;

        if (statusFilter === 'sudah' || statusFilter === 'belum') {
            column.setFilterValue(statusFilter);
        } else {
            column.setFilterValue(undefined); // 'all' atau kosong
        }
    }, [statusFilter, table]);

    const handleSubmitName = async () => {
        if (!customerName.trim()) {
            alert('Nama customer tidak boleh kosong.');
            return;
        }

        let id_perusahaan = selectedPerusahaanId;

        if (userRole === 'user') {
            id_perusahaan = auth.user?.id_perusahaan?.toString() || '';
        }

        if (!id_perusahaan) {
            alert('ID Perusahaan tidak valid.');
            return;
        }

        const token = nanoid(12);

        try {
            const res = await axios.post(route('customer-links.store'), {
                nama_customer: customerName,
                token,
                id_perusahaan,
            });
            console.log(id_perusahaan);

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
        <div>
            <div className="flex items-center gap-2 pb-4">
                <div className="flex gap-2">
                    <Select value={filterColumn} onValueChange={(val) => setFilterColumn(val as any)}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Pilih Kolom" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nama_customer">Nama Customer</SelectItem>
                            <SelectItem value="nama_user">Disubmit Oleh</SelectItem>
                            <SelectItem value="nama_perusahaan">Ownership</SelectItem>
                        </SelectContent>
                    </Select>

                    <Input
                        placeholder="Ketik kata kunci..."
                        value={filterValue}
                        onChange={(event) => setFilterValue(event.target.value)}
                        className="max-w-sm"
                    />
                    <Button variant="outline" className="h-auto" onClick={() => setFilterValue('')}>
                        Reset
                    </Button>
                </div>

                {userRole === 'direktur' && (
                    <div>
                        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as 'sudah' | 'belum' | 'all')}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua</SelectItem>
                                <SelectItem value="sudah">Sudah Terisi</SelectItem>
                                <SelectItem value="belum">Belum Terisi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <DataTableViewOptions table={table} />
                {['user', 'manager', 'direktur'].includes(userRole) && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="h-9">Add customer</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Pilih Metode</DialogTitle>
                                <DialogDescription>Apakah Anda ingin membagikan formulir ke customer, atau isi sendiri di sini?</DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 py-4">
                                <Link href="/customer/create?mode=manual">
                                    <Button className="w-full">Buat Sendiri</Button>
                                </Link>
                                <Button variant="outline" className="w-full" onClick={() => setIsNameDialogOpen(true)}>
                                    Bagikan ke Customer
                                </Button>
                            </div>
                            <DialogFooter>
                                <p className="text-muted-foreground text-xs">Anda dapat mengubah pilihan ini nanti.</p>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table} />
            {/* Dialog input nama */}
            <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pilih perusahaan yang ingin dituju</DialogTitle>
                        <div className="mb-6 flex flex-col gap-4">
                            {auth.user?.roles?.some((role: any) => ['manager', 'direktur'].includes(role.name)) && (
                                <div>
                                    <DialogDescription>Perusahaan</DialogDescription>
                                    <Select value={selectedPerusahaanId} onValueChange={(value) => setSelectedPerusahaanId(value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Pilih Perusahaan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {auth.user?.companies?.map((perusahaan: any) => (
                                                <SelectItem key={perusahaan.id} value={String(perusahaan.id)}>
                                                    {perusahaan.nama_perusahaan}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <DialogTitle>Masukkan Nama Customer</DialogTitle>
                        <DialogDescription>Nama ini akan digunakan untuk membuat link unik.</DialogDescription>
                        <Input
                            className="mb-6"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Contoh: Budi Santoso"
                        />
                        <Button onClick={handleSubmitName}>Submit</Button>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            {/* Dialog tampilkan link */}
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Link Berhasil Dibuat</DialogTitle>
                        <DialogDescription>Salin link berikut dan kirimkan ke customer.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-between rounded bg-gray-100 px-3 py-2 dark:bg-black">
                        <span className="truncate text-sm">{generatedLink}</span>
                        <button onClick={handleCopy} className="ml-4 text-blue-600 hover:text-blue-800">
                            <Copy className="h-5 w-5" />
                        </button>
                    </div>
                    <Button onClick={() => setIsLinkDialogOpen(false)} className="w-full bg-green-600 hover:bg-green-700">
                        Tutup
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}
