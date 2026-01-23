import { ResettableDropzoneImage } from '@/components/ResettableDropzoneImage';
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
import { ChangeEvent, useState } from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface User {
    id: number;
    name: string;
}

interface FormState {
    nama_perusahaan: string;
    domain: string;
    id_User_1: string;
    id_User_2: string;
    id_User_3: string;
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

    const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const [form, setForm] = useState<FormState>({
        nama_perusahaan: '',
        domain: '',
        id_User_1: '',
        id_User_2: '',
        id_User_3: '',
        notify_1: '',
        notify_2: '',
    });

    const handleSubmit = () => {
        const fd = new FormData();

        // field biasa
        fd.append('nama_perusahaan', form.nama_perusahaan);
        fd.append('domain', form.domain);
        fd.append('id_User_1', form.id_User_1);
        fd.append('id_User_2', form.id_User_2);
        fd.append('id_User_3', form.id_User_3);
        fd.append('notify_1', form.notify_1 ?? '');
        fd.append('notify_2', form.notify_2 ?? '');

        // file logo jika ada
        if (companyLogoFile) {
            fd.append('company_logo', companyLogoFile);
        }

        router.post('/perusahaan', fd, {
            forceFormData: true,
            onSuccess: () => {
                setOpenCreate(false);
                setForm({
                    nama_perusahaan: '',
                    domain: '',
                    id_User_1: '',
                    id_User_2: '',
                    id_User_3: '',
                    notify_1: '',
                    notify_2: '',
                });
                setCompanyLogoFile(null);
            },
            onError: (errors) => {
                console.error('❌ Error:', errors);
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
        state: { sorting, columnFilters, columnVisibility, rowSelection },
    });

    const userRoles = [
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

            {/* Dialog Tambah */}
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

                        <div>
                            <Label htmlFor="domain">Domain Lengkap</Label>
                            <Input
                                id="domain"
                                name="domain"
                                value={form.domain}
                                onChange={handleInputChange}
                                placeholder="Contoh: alpha.registration.tako.co.id"
                                required
                            />
                            <p className="text-muted-foreground mt-1 text-xs">Masukkan domain lengkap secara manual (Full URL).</p>
                        </div>

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
                                        <div className="text-black">
                                            <option value="">Pilih User</option>

                                            {users.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name}
                                                </option>
                                            ))}
                                        </div>
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div>
                            <ResettableDropzoneImage label="Upload Logo Perusahaan" isRequired={false} onFileChange={setCompanyLogoFile} />
                        </div>

                        <div>
                            <Label htmlFor="notify_1">Notify 1 (email, pisahkan dengan koma)</Label>
                            <textarea
                                id="notify_1"
                                className="w-full rounded border px-2 py-1"
                                rows={3}
                                value={form.notify_1}
                                onChange={(e) => setForm({ ...form, notify_1: e.target.value })}
                                placeholder="email1@contoh.com, email2@contoh.com"
                            />
                            <div>
                                <Label htmlFor="notify_2">Notifikasi Email 2</Label>
                                <Input
                                    id="notify_2"
                                    name="notify_2"
                                    value={form.notify_2}
                                    onChange={handleInputChange}
                                    placeholder="email2@contoh.com"
                                />
                            </div>
                        </div>
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
