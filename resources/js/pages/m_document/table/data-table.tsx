/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { ChangeEvent, useState } from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

// Interface Data dari Backend
interface MasterDocument {
    id_dokumen: number;
    id_section: number;
    nama_file: string;
    description_file?: string;
    // Tambahkan field lain sesuai dd($documents)
}

interface MasterSection {
    id_section: number;
    section_name: string;
}

interface PageProps {
    documents: MasterDocument[];
    sections: MasterSection[];
    users?: any[]; // Jika masih dibutuhkan untuk form lain
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    // Data tabel sekarang dinamis, tapi defaultnya kita pakai TData
    data: TData[];
    filterKey?: string;
}

export function DataTable<TData, TValue>({ columns, data, filterKey = 'nama_file' }: DataTableProps<TData, TValue>) {
    // 1. Ambil data documents dan sections dari props Inertia
    const { documents, sections } = usePage<PageProps>().props;

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    // State Form Create Document (Bukan Perusahaan lagi)
    const [openCreate, setOpenCreate] = React.useState(false);

    // Sesuaikan form state dengan kebutuhan Master Document
    const [form, setForm] = useState({
        nama_file: '',
        id_section: '',
        description_file: '',
        // Tambahkan field lain seperti link_path, video url dll
    });

    const table = useReactTable({
        // Gunakan data dari props 'data' yang dilempar dari parent component (index.tsx)
        // Pastikan di index.tsx: <DataTable data={documents} ... />
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

    // --- FORM HANDLERS ---
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        router.post('/master-documents', form, {
            // Sesuaikan route store
            onSuccess: () => {
                setOpenCreate(false);
                setForm({ nama_file: '', id_section: '', description_file: '' });
            },
            onError: (errors) => console.error(errors),
        });
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Filter nama dokumen..."
                    value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                    onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                    className="max-w-sm"
                />
                <DataTableViewOptions table={table} />
                <Button onClick={() => setOpenCreate(true)}>Tambah Dokumen</Button>
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
                                    Tidak ada data dokumen.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <DataTablePagination table={table} />

            {/* Dialog Tambah Dokumen */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Tambah Master Dokumen</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Nama File */}
                        <div>
                            <Label htmlFor="nama_file">Nama Dokumen</Label>
                            <Input
                                id="nama_file"
                                name="nama_file"
                                value={form.nama_file}
                                onChange={handleInputChange}
                                placeholder="Contoh: Bill of Lading"
                            />
                        </div>

                        {/* Pilihan Section */}
                        <div>
                            <Label htmlFor="id_section">Section</Label>
                            <select
                                id="id_section"
                                name="id_section"
                                className="w-full rounded border px-2 py-1"
                                value={form.id_section}
                                onChange={handleInputChange}
                            >
                                <option value="">Pilih Section</option>
                                {sections.map((sec) => (
                                    <option key={sec.id_section} value={sec.id_section}>
                                        {sec.section_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Deskripsi */}
                        <div>
                            <Label htmlFor="description_file">Deskripsi</Label>
                            <textarea
                                id="description_file"
                                name="description_file"
                                className="w-full rounded border px-2 py-1"
                                rows={3}
                                value={form.description_file}
                                onChange={handleInputChange}
                                placeholder="Deskripsi dokumen..."
                            />
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
