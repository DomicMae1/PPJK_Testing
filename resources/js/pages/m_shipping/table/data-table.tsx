/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
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
import { ChevronUp, Clipboard, CopyPlus, Image as ImageIcon, Trash2, X } from 'lucide-react'; // Import Icon Plus & Upload
import { nanoid } from 'nanoid';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

interface HsCodeItem {
    id: string;
    code: string;
    link: string;
    file: File | null;
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
    const { props } = usePage();
    const auth = props.auth || {};
    const userRole = auth.user?.roles?.[0]?.name ?? '';
    const externalCustomers = props.externalCustomers || [];
    const isUserExternal = auth.user?.role === 'eksternal';

    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'keterangan_status', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [hasUserSorted, setHasUserSorted] = React.useState(false);

    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [statusFilter, setStatusFilter] = useState<'sudah' | 'belum' | ''>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [shipmentType, setShipmentType] = useState<'Import' | 'Export'>('Import');
    const [blNumber, setBlNumber] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [hsCodes, setHsCodes] = useState<HsCodeItem[]>([{ id: nanoid(), code: '', link: '', file: null }]);

    const [filterColumn, setFilterColumn] = useState<'nama_customer' | 'creator_name' | 'nama_perusahaan' | 'keterangan_status' | 'status'>(
        'nama_customer',
    );

    const [filterValue, setFilterValue] = useState('');
    const isKeteranganStatus = filterColumn === 'keterangan_status';
    const isStatusReview = filterColumn === 'status';
    const [selectedPerusahaanId, setSelectedPerusahaanId] = useState<string>('');
    const { language, setLanguage, t } = useLanguage();

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: (updater) => {
            setHasUserSorted(true);
            setSorting(updater);
        },
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

    useEffect(() => {
        const column = table.getColumn(filterColumn);
        if (!column) return;

        column.setFilterValue(filterValue === '' ? undefined : filterValue);
    }, [filterValue, filterColumn, table]);

    useEffect(() => {
        if (isUserExternal && externalCustomers.length > 0) {
            setSelectedCustomer(String(externalCustomers[0].id_customer));
        }
    }, [isUserExternal, externalCustomers]);

    const handleReset = () => {
        table.resetColumnFilters();
        setColumnFilters([]);
        setFilterValue('');
        table.resetSorting();
        setSorting([{ id: 'keterangan_status', desc: true }]);
        setHasUserSorted(false);
        setFilterColumn('nama_customer');
    };

    const addHsCodeField = () => {
        setHsCodes([...hsCodes, { id: nanoid(), code: '', link: '', file: null }]);
    };

    const removeHsCodeField = (id: number) => {
        setHsCodes(hsCodes.filter((item) => item.id !== id));
    };

    const updateHsCode = (id: string, field: keyof HsCodeItem, value: any) => {
        setHsCodes(hsCodes.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const handleSaveShipment = () => {
        // A. Validasi Sederhana
        if (!blNumber || !selectedCustomer) {
            alert('Harap lengkapi BL Number dan Customer');
            return;
        }

        // B. Validasi HS Code (Minimal satu dan harus ada kodenya)
        const invalidHs = hsCodes.find((item) => !item.code);
        if (invalidHs) {
            alert('Harap isi nomor HS Code');
            return;
        }

        // C. Buat Object FormData
        const formData = new FormData();

        // Append data tunggal
        formData.append('shipment_type', shipmentType);
        formData.append('bl_number', blNumber);
        formData.append('id_customer', selectedCustomer);

        // Append Array HS Codes
        hsCodes.forEach((item, index) => {
            // 1. Kode HS
            formData.append(`hs_codes[${index}][code]`, item.code);

            // 2. Link (Kirim kosong karena inputnya sudah dihapus di UI)
            // Ini penting agar validasi backend 'nullable|string' tetap lolos
            formData.append(`hs_codes[${index}][link]`, '');

            // 3. File Gambar (Jika User mengupload/paste gambar)
            if (item.file) {
                formData.append(`hs_codes[${index}][file]`, item.file);
            }
        });

        // D. Kirim Request ke Backend
        router.post('/shipping', formData, {
            forceFormData: true, // Wajib true agar file terkirim sebagai multipart/form-data
            onSuccess: () => {
                // Reset form jika sukses
                setIsDialogOpen(false);
                setBlNumber('');
                setHsCodes([{ id: nanoid(), code: '', link: '', file: null }]);
                // Opsional: toast.success('Data berhasil disimpan');
            },
            onError: (errors) => {
                console.error('Gagal menyimpan:', errors);
                // Handle Error Spesifik
                if (errors.bl_number) alert(`BL Number: ${errors.bl_number}`);
                else if (errors.id_customer) alert(`Customer: ${errors.id_customer}`);
                else if (errors['hs_codes.0.code']) alert('HS Code pertama wajib diisi');
                else if (errors['hs_codes.0.file']) alert('File pada HS Code pertama bermasalah');
                else alert('Terjadi kesalahan saat menyimpan data. Cek inputan Anda.');
            },
        });
    };

    return (
        <div>
            <div className="flex hidden items-center gap-2 pb-4 md:block">
                <div className="flex gap-2">
                    <Select value={filterColumn} onValueChange={(val) => setFilterColumn(val as any)}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Pilih Kolom" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nama_perusahaan">Ownership</SelectItem>
                            <SelectItem value="creator_name">Disubmit Oleh</SelectItem>
                            <SelectItem value="nama_customer">Nama Customer</SelectItem>
                            <SelectItem value="keterangan_status">Keterangan Status</SelectItem>
                            <SelectItem value="status">Status Review</SelectItem>
                        </SelectContent>
                    </Select>

                    {isKeteranganStatus ? (
                        <Select value={filterValue} onValueChange={(val) => setFilterValue(val)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Pilih Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="diinput">Diinput</SelectItem>
                                <SelectItem value="disubmit">Disubmit</SelectItem>
                                <SelectItem value="diverifikasi">Diverifikasi</SelectItem>
                                <SelectItem value="diketahui">Diketahui</SelectItem>
                                <SelectItem value="direview">Direview</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : isStatusReview ? (
                        <Select value={filterValue} onValueChange={(val) => setFilterValue(val)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Pilih Review Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="approved">Aman</SelectItem>
                                <SelectItem value="rejected">Bermasalah</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            placeholder="Typing keyword..."
                            value={filterValue}
                            onChange={(event) => setFilterValue(event.target.value)}
                            className="max-w-sm"
                        />
                    )}
                    <Button variant="outline" className="h-auto" onClick={handleReset}>
                        Reset
                    </Button>

                    <Select value={language} onValueChange={(val) => setLanguage(val as any)}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder={t('bahasa')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="id">🇮🇩 {t('indonesia')}</SelectItem>
                            <SelectItem value="en">🇬🇧 {t('english')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {userRole === 'supervisor' && (
                        <div>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as 'sudah' | 'belum' | 'all')}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    <SelectItem value="sudah">Sudah Mengetahui</SelectItem>
                                    <SelectItem value="belum">Belum Mengetahui</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 pt-4">
                    <DataTableViewOptions table={table} />
                    {userRole && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="h-9">Add Shipment</Button>
                            </DialogTrigger>

                            {/* PERBAIKAN DISINI: Tambahkan 'max-h-[85vh] overflow-y-auto' */}
                            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[550px]">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">Data Shipment</DialogTitle>
                                    <DialogDescription className="hidden">Form input data shipment</DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    {/* Shipment Type Toggle */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Shipment Type</Label>
                                        <div className="flex w-full gap-2">
                                            <Button
                                                type="button"
                                                className={`w-1/2 ${shipmentType === 'Import' ? 'bg-black text-white hover:bg-gray-800' : 'border bg-white text-black hover:bg-gray-100'}`}
                                                onClick={() => setShipmentType('Import')}
                                            >
                                                Import
                                            </Button>
                                            <Button
                                                type="button"
                                                className={`w-1/2 ${shipmentType === 'Export' ? 'bg-black text-white hover:bg-gray-800' : 'border bg-white text-black hover:bg-gray-100'}`}
                                                onClick={() => setShipmentType('Export')}
                                            >
                                                Export
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Input Dynamic Label (BL vs SI) */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold">
                                            {shipmentType === 'Import' ? 'Input Bill of Lading' : 'Input Shipping Instruction'}
                                        </Label>
                                        <Input
                                            placeholder={shipmentType === 'Import' ? 'Input BL number' : 'Input BL/BC number'}
                                            value={blNumber}
                                            onChange={(e) => setBlNumber(e.target.value)}
                                        />
                                    </div>

                                    {/* Input Customer */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Input Customer</Label>
                                        <Select
                                            value={selectedCustomer}
                                            onValueChange={setSelectedCustomer}
                                            // Disable dropdown jika user adalah eksternal (karena sudah auto-select)
                                            disabled={isUserExternal}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select customer name" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {externalCustomers.length > 0 ? (
                                                    externalCustomers.map((cust) => (
                                                        <SelectItem key={cust.id_customer} value={String(cust.id_customer)}>
                                                            {/* Disini 'cust.nama' akan otomatis berisi:
                                            - 'Nama Perusahaan' (jika login sebagai Eksternal)
                                            - 'Nama User' (jika login sebagai Internal)
                                            sesuai logic Controller
                                        */}
                                                            {cust.nama}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <div className="p-2 text-center text-sm text-gray-500">Data tidak ditemukan</div>
                                                )}
                                            </SelectContent>
                                        </Select>

                                        {/* (Opsional) Pesan info buat External User */}
                                        {isUserExternal && <p className="text-[10px] text-gray-500">*Otomatis terpilih sesuai akun Anda</p>}
                                    </div>

                                    {/* Data HS Code Section */}
                                    <div className="space-y-4 pb-4">
                                        {/* Header Section */}
                                        <div className="flex items-center justify-between px-1">
                                            <Label className="text-base font-bold">Data Hs Code</Label>
                                            <ChevronUp className="h-4 w-4" />
                                        </div>

                                        {/* List HS Codes (Kotak Terpisah) */}
                                        <div className="flex flex-col gap-4">
                                            {hsCodes.map((item, index) => (
                                                <div key={item.id} className="relative rounded-lg border bg-white p-4 shadow-sm">
                                                    {/* TOMBOL DELETE (TRASH ICON) */}
                                                    {index > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeHsCodeField(item.id)}
                                                            className="absolute top-3 right-3 text-red-500 transition-colors hover:text-red-700"
                                                            title="Hapus HS Code"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    <div className="grid gap-3 pt-1">
                                                        {/* Input HS Code */}
                                                        <div className="space-y-1">
                                                            <Label className="text-sm">Input HS Code</Label>
                                                            <Input
                                                                placeholder="Input Hs Code number"
                                                                value={item.code}
                                                                onChange={(e) => updateHsCode(item.id, 'code', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* File Upload */}
                                                        <div className="space-y-2">
                                                            <Label className="text-sm">INSW Link reference</Label>
                                                            {item.file ? (
                                                                <div className="relative flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-4">
                                                                    {/* Tombol Hapus File */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateHsCode(item.id, 'file', null)}
                                                                        className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>

                                                                    {/* Preview */}
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        {item.file.type.startsWith('image/') ? (
                                                                            <img
                                                                                src={URL.createObjectURL(item.file)}
                                                                                alt="Preview"
                                                                                className="max-h-32 rounded object-contain"
                                                                            />
                                                                        ) : (
                                                                            <div className="flex flex-col items-center text-gray-500">
                                                                                <ImageIcon className="mb-2 h-10 w-10" />
                                                                                <span className="text-xs">{item.file.name}</span>
                                                                            </div>
                                                                        )}
                                                                        <span className="text-xs font-medium text-gray-500">{item.file.name}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* Tombol Upload & Paste jika belum ada file */
                                                                <div className="flex flex-col gap-3">
                                                                    {/* 1. Tombol Pilih File dari Komputer */}
                                                                    <div className="relative">
                                                                        <Input
                                                                            type="file"
                                                                            className="hidden"
                                                                            id={`file-${item.id}`}
                                                                            accept="image/*" // PERBAIKAN: Hanya menerima semua tipe gambar
                                                                            onChange={(e) =>
                                                                                updateHsCode(item.id, 'file', e.target.files?.[0] || null)
                                                                            }
                                                                        />
                                                                        <label
                                                                            htmlFor={`file-${item.id}`}
                                                                            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#1d64d0] text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                                                                        >
                                                                            <ImageIcon className="h-4 w-4" />
                                                                            Pilih File Gambar
                                                                        </label>
                                                                    </div>

                                                                    {/* 2. Tombol Paste from Clipboard */}
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white text-sm font-bold text-[#1d64d0] shadow-sm hover:bg-gray-50"
                                                                        onClick={async (e) => {
                                                                            e.preventDefault();
                                                                            try {
                                                                                const clipboardItems = await navigator.clipboard.read();
                                                                                let imageFound = false;

                                                                                for (const clipItem of clipboardItems) {
                                                                                    // Cari tipe image
                                                                                    const imageType = clipItem.types.find((type) =>
                                                                                        type.startsWith('image/'),
                                                                                    );

                                                                                    if (imageType) {
                                                                                        const blob = await clipItem.getType(imageType);
                                                                                        let extension = imageType.split('/')[1];
                                                                                        if (extension === 'jpeg') extension = 'jpg';

                                                                                        const fileName = `clipboard-${Date.now()}.${extension}`;
                                                                                        const file = new File([blob], fileName, { type: imageType });

                                                                                        updateHsCode(item.id, 'file', file);
                                                                                        imageFound = true;
                                                                                        break;
                                                                                    }
                                                                                }

                                                                                if (!imageFound) {
                                                                                    alert(
                                                                                        'Tidak ada gambar di clipboard. Silakan screenshot atau copy gambar terlebih dahulu.',
                                                                                    );
                                                                                }
                                                                            } catch (err) {
                                                                                console.error(err);
                                                                                alert('Gagal mengakses clipboard. Pastikan browser diizinkan.');
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Clipboard className="h-4 w-4" />
                                                                        Paste Screenshot (Clipboard)
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Add Another HS Code Button */}
                                    <Button
                                        variant="outline"
                                        className="flex w-full items-center gap-2 border-blue-200 text-blue-600 hover:text-blue-700"
                                        onClick={addHsCodeField}
                                    >
                                        <CopyPlus className="h-4 w-4" />
                                        Add Another HS Code
                                    </Button>

                                    {/* Save Button */}
                                    <Button className="w-full bg-gray-200 text-black hover:bg-gray-300" onClick={handleSaveShipment}>
                                        Save
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="hidden rounded-md border md:block">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                            <button className="flex items-center gap-1" onClick={() => header.column.toggleSorting()}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {hasUserSorted &&
                                                    (header.column.getIsSorted() === 'asc'
                                                        ? '⬆️'
                                                        : header.column.getIsSorted() === 'desc'
                                                          ? '⬇️'
                                                          : '')}
                                            </button>
                                        ) : (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        )}
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
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <DataTablePagination table={table} />
            <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        {auth.user?.roles?.some((role: any) => ['manager', 'direktur'].includes(role.name)) && (
                            <>
                                <DialogTitle>Pilih perusahaan yang ingin dituju</DialogTitle>
                                <div className="mb-6 flex flex-col gap-4">
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
                                </div>
                            </>
                        )}
                        <DialogTitle>Masukkan Nama Customer</DialogTitle>
                        <DialogDescription>Nama ini akan digunakan untuk membuat link unik.</DialogDescription>
                        <Input
                            className="mb-6"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Contoh: Budi Santoso"
                        />
                        {/* <Button onClick={handleSubmitName}>Submit</Button> */}
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent className="w-[95vw] max-w-[95vw] overflow-y-auto rounded-xl p-4 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">Link Berhasil Dibuat</DialogTitle>
                        <DialogDescription className="text-sm">Salin link berikut dan kirimkan ke customer.</DialogDescription>
                    </DialogHeader>

                    <Button
                        onClick={() => setIsLinkDialogOpen(false)}
                        className="mt-4 w-full rounded-lg bg-green-600 py-2 text-sm hover:bg-green-700"
                    >
                        Tutup
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}
