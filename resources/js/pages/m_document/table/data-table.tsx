/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzone } from '@/components/ResettableDropzone';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Import Description
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
interface DocumentData {
    id_dokumen: number;
    id_section: number;
    nama_file: string;
    description_file: string;
    is_internal: boolean;
    attribute: boolean;
    link_path_example_file?: string;
    link_path_template_file?: string;
    link_url_video_file?: string;
    source?: 'master' | 'trans';
    section?: MasterSection;
}

interface MasterSection {
    id_section: number;
    section_name: string;
}

interface PageProps {
    documents: DocumentData[];
    sections: MasterSection[];
    flash: { success?: string; error?: string };
    auth: { user: any };
    [key: string]: any;
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    // Data tabel sekarang dinamis, tapi defaultnya kita pakai TData
    data: TData[];
    filterKey?: string;
}

export function DataTable<TData, TValue>({ columns, data, filterKey = 'nama_file' }: DataTableProps<TData, TValue>) {
    // 1. Ambil data documents dan sections dari props Inertia
    const { documents, sections, flash, auth } = usePage<PageProps>().props;

    const userRole = auth.user?.roles?.[0]?.name;
    const isManager = ['manager', 'supervisor'].includes(userRole);
    const isAdmin = userRole === 'admin';

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
        is_internal: false,
        attribute: false,
        link_url_video_file: '',
        file_example: null as File | null, // Untuk file
        file_template: null as File | null, // Untuk file
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

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>, field: 'file_example' | 'file_template') => {
        if (e.target.files && e.target.files[0]) {
            setForm((prev) => ({ ...prev, [field]: e.target.files![0] }));
        }
    };

    const handleDropzoneChange = (field: 'link_path_example_file' | 'link_path_template_file', response: any) => {
        if (response && (response.status === 'success' || response.path)) {
            setForm((prev) => ({ ...prev, [field]: response.path }));
        } else {
            // Jika reset/hapus
            setForm((prev) => ({ ...prev, [field]: '' }));
        }
    };

    // Helper Boolean
    const handleBooleanChange = (field: 'is_internal' | 'attribute', value: boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        // Inertia otomatis menangani FormData jika ada file di dalam object payload
        router.post('/document', form as any, {
            onSuccess: () => {
                setOpenCreate(false);
                // Reset Form
                setForm({
                    nama_file: '',
                    id_section: '',
                    description_file: '',
                    is_internal: false,
                    attribute: false,
                    link_url_video_file: '',
                    file_example: null,
                    file_template: null,
                });
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
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isManager ? 'Tambah Dokumen Internal Perusahaan' : 'Tambah Master Dokumen (Global)'}</DialogTitle>
                        <DialogDescription>
                            {isManager
                                ? 'Dokumen ini hanya akan tersedia untuk perusahaan Anda.'
                                : 'Dokumen ini akan tersedia untuk semua perusahaan sebagai standar.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Nama File */}
                        <div>
                            <Label htmlFor="nama_file">Nama Dokumen</Label>
                            <Input
                                id="nama_file"
                                name="nama_file"
                                value={form.nama_file}
                                onChange={handleInputChange}
                                placeholder="Contoh: SOP Gudang"
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
                                {sections.map((sec: any) => (
                                    <option key={sec.id_section} value={sec.id_section}>
                                        {sec.section_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex">
                            {/* === INPUT BARU: Is Internal? === */}
                            <div>
                                <Label className="mb-2 block">Dokumen ini akan diupload oleh siapa</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.is_internal ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_internal', true)}
                                        className="w-20"
                                    >
                                        Internal
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!form.is_internal ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_internal', false)}
                                        className="w-20"
                                    >
                                        External
                                    </Button>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    {form.is_internal
                                        ? 'Dokumen ini hanya untuk penggunaan internal.'
                                        : 'Dokumen ini bisa diakses publik/eksternal jika diperlukan.'}
                                </p>
                            </div>

                            {/* === INPUT BARU: Attribute? === */}
                            <div>
                                <Label className="mb-2 block">Mandatory atau tidak?</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.attribute ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('attribute', true)}
                                        className="w-20"
                                    >
                                        Ya
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!form.attribute ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('attribute', false)}
                                        className="w-20"
                                    >
                                        Tidak
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="link_url_video_file">Link Video Tutorial (Youtube)</Label>
                            <Input
                                id="link_url_video_file"
                                name="link_url_video_file"
                                value={form.link_url_video_file}
                                onChange={handleInputChange}
                                placeholder="https://youtube.com/..."
                            />
                        </div>

                        <div className="max-w-[250px] sm:max-w-[300px]">
                            <Label className="mb-2" htmlFor="file_example">
                                Contoh File
                            </Label>
                            <div className="w-full">
                                <ResettableDropzone
                                    label="Upload Contoh"
                                    isRequired={false}
                                    uploadConfig={{
                                        url: '/document/upload-temp', // Pastikan route ini ada di backend Anda
                                        payload: { type: 'example', doc_name: form.nama_file }, // Sesuaikan payload jika perlu
                                    }}
                                    onFileChange={(file, response) => handleDropzoneChange('link_path_example_file', response)}
                                    // Jika ingin menampilkan file yang sudah ada (saat edit), gunakan existingFile prop
                                />
                            </div>
                        </div>

                        <div className="max-w-[250px] sm:max-w-[300px]">
                            <Label htmlFor="file_template">Template File</Label>
                            <div className="w-full">
                                <ResettableDropzone
                                    label="Upload Template"
                                    isRequired={false}
                                    uploadConfig={{
                                        url: '/document/upload-temp',
                                        payload: { type: 'template', doc_name: form.nama_file },
                                    }}
                                    onFileChange={(file, response) => handleDropzoneChange('link_path_template_file', response)}
                                />
                            </div>
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
