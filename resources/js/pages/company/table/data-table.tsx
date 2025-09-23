/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { router, usePage } from '@inertiajs/react';
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
import * as React from 'react';
import { useState } from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface User {
    id: number;
    name: string;
}

// 👇 1. Tambahkan id_User ke dalam FormState
interface FormState {
    nama_perusahaan: string;
    id_User: string; // Untuk User/Marketing
    id_User_1: string; // Manager
    id_User_2: string; // Direktur
    id_User_3: string; // Lawyer
    notify_1: string;
    notify_2?: string;
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    filterKey?: string;
}

export function DataTable<TData, TValue>({ columns, data, filterKey = 'nama_perusahaan' }: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [openCreate, setOpenCreate] = React.useState(false);

    const { props } = usePage<{ users: User[] }>();
    const users = props.users ?? [];

    // 👇 2. Tambahkan id_User ke state awal
    const [form, setForm] = useState<FormState>({
        nama_perusahaan: '',
        id_User: '',
        id_User_1: '',
        id_User_2: '',
        id_User_3: '',
        notify_1: '',
        notify_2: '',
    });

    const handleSubmit = () => {
        router.post('/perusahaan', form as Record<string, any>, {
            onSuccess: () => {
                setOpenCreate(false);
                // 👇 3. Reset id_User setelah sukses
                setForm({
                    nama_perusahaan: '',
                    id_User: '',
                    id_User_1: '',
                    id_User_2: '',
                    id_User_3: '',
                    notify_1: '',
                    notify_2: '',
                });
            },
            onError: (errors: Record<string, any>) => {
                console.error('❌ Gagal menyimpan perusahaan:', errors);
            },
        });
    };

    const handleUserChange = (key: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

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

    // 👇 4. Buat array untuk mempermudah mapping form
    const userRoles = [
        { key: 'id_User', label: 'User/Marketing' },
        { key: 'id_User_1', label: 'Manager' },
        { key: 'id_User_2', label: 'Direktur' },
        { key: 'id_User_3', label: 'Lawyer' },
    ];

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Filter nama perusahaan..."
                    value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                    onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                    className="max-w-sm"
                />
                <DataTableViewOptions table={table} />
                <Button onClick={() => setOpenCreate(true)}>Tambah Perusahaan</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
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
                                    Tidak ada data.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <DataTablePagination table={table} />

            {/* Dialog */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Tambah Perusahaan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="nama_perusahaan">Nama Perusahaan</Label>
                            <Input
                                id="nama_perusahaan"
                                value={form.nama_perusahaan}
                                onChange={(e) => setForm({ ...form, nama_perusahaan: e.target.value })}
                                placeholder="Contoh: PT. Maju Mundur"
                            />
                        </div>

                        {/* 👇 5. Gunakan grid 2x2 dan mapping dari array userRoles */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {userRoles.map(({ key, label }) => (
                                <div key={key}>
                                    <Label htmlFor={key}>{label}</Label>
                                    <select
                                        id={key}
                                        className="w-full rounded border px-2 py-1"
                                        value={form[key as keyof FormState]}
                                        onChange={(e) => handleUserChange(key as keyof FormState, e.target.value)}
                                    >
                                        <option value="">Pilih User</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div>
                            <Label htmlFor="notify_1">Notify 1 (email, pisahkan dengan koma)</Label>
                            <textarea
                                id="notify_1"
                                className="w-full rounded border px-2 py-1"
                                rows={3}
                                value={form.notify_1}
                                onChange={(e) => setForm({ ...form, notify_1: e.target.value })}
                                placeholder="contoh@email.com, lain@email.com"
                            />
                        </div>

                        <input type="hidden" value={form.notify_2} />
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button type="button" onClick={handleSubmit}>
                            Simpan
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Batal
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
