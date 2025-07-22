/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { router, usePage } from '@inertiajs/react'; // ✅ Tambahkan ini
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

interface FormState {
    nama_perusahaan: string;
    id_User_1: string;
    id_User_2: string;
    id_User_3: string;
    Notify_1: string;
    Notify_2?: string;
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

    const [form, setForm] = useState<FormState>({
        nama_perusahaan: '',
        id_User_1: '',
        id_User_2: '',
        id_User_3: '',
        Notify_1: '',
        Notify_2: '',
    });

    const handleSubmit = () => {
        router.post('/perusahaan', form as Record<string, any>, {
            onSuccess: () => {
                setOpenCreate(false);
                setForm({
                    nama_perusahaan: '',
                    id_User_1: '',
                    id_User_2: '',
                    id_User_3: '',
                    Notify_1: '',
                    Notify_2: '',
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

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {['Manager', 'Direktur', 'Lawyer'].map((i) => {
                                const key = `id_User_${i}` as keyof FormState;
                                return (
                                    <div key={i}>
                                        <Label htmlFor={key}>User {i}</Label>
                                        <select
                                            id={key}
                                            className="w-full rounded border px-2 py-1"
                                            value={form[key]}
                                            onChange={(e) => handleUserChange(key, e.target.value)}
                                        >
                                            <option value="">Pilih User</option>
                                            {users.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>

                        <div>
                            <Label htmlFor="Notify_1">Notify 1 (email, pisahkan dengan koma)</Label>
                            <textarea
                                id="Notify_1"
                                className="w-full rounded border px-2 py-1"
                                rows={3}
                                value={form.Notify_1}
                                onChange={(e) => setForm({ ...form, Notify_1: e.target.value })}
                                placeholder="contoh@email.com, lain@email.com"
                            />
                        </div>

                        <input type="hidden" value={form.Notify_2} />
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
