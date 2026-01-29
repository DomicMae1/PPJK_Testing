/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ChevronUp, Clipboard, CopyPlus, Image as ImageIcon, Plus, Trash2, X } from 'lucide-react'; // Import Icon Plus & Upload
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
    const auth = (props.auth as any) || {};
    const userRole = auth.user?.roles?.[0]?.name ?? '';
    const externalCustomers = (props.externalCustomers as any[]) || [];
    const internalStaff = (props.internalStaff as any[]) || []; // NEW: Retrieve Internal Staff
    const isUserExternal = auth.user?.role === 'eksternal';

    const trans = props.trans_general as Record<string, string>;
    const currentLocale = props.locale as string;

    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'keterangan_status', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [hasUserSorted, setHasUserSorted] = React.useState(false);

    const [statusFilter, setStatusFilter] = useState<'sudah' | 'belum' | ''>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [shipmentType, setShipmentType] = useState<'Import' | 'Export'>('Import');
    const [blNumber, setBlNumber] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedStaff, setSelectedStaff] = useState(''); // NEW: Selected Staff State
    const [hsCodes, setHsCodes] = useState<HsCodeItem[]>([{ id: nanoid(), code: '', link: '', file: null }]);

    const [filterColumn, setFilterColumn] = useState<'nama_customer' | 'creator_name' | 'nama_perusahaan' | 'keterangan_status' | 'status'>(
        'nama_customer',
    );

    const [filterValue, setFilterValue] = useState('');
    const isKeteranganStatus = filterColumn === 'keterangan_status';
    const isStatusReview = filterColumn === 'status';

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
            alert(trans.alert_complete_data); // Translate Alert
            return;
        }

        const invalidHs = hsCodes.find((item) => !item.code);
        if (invalidHs) {
            alert(trans.alert_hs_code); // Translate Alert
            return;
        }

        // C. Buat Object FormData
        const formData = new FormData();

        // Append data tunggal
        formData.append('shipment_type', shipmentType);
        formData.append('bl_number', blNumber);
        formData.append('id_customer', selectedCustomer);

        // NEW: Append Assigned PIC if selected
        if (selectedStaff) {
            formData.append('assigned_pic', selectedStaff);
        }

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
                // Translate Alert Error
                if (errors.bl_number) alert(`BL Number: ${errors.bl_number}`);
                else if (errors.id_customer) alert(`Customer: ${errors.id_customer}`);
                else if (errors['hs_codes.0.code']) alert(trans.alert_hs_code_first);
                else if (errors['hs_codes.0.file']) alert(trans.alert_file_problem);
                else alert(trans.alert_save_error);
            },
        });
    };

    return (
        <div>
            <div className="flex hidden items-center gap-2 pb-4 md:block">
                <div className="flex gap-2">
                    <Select value={filterColumn} onValueChange={(val) => setFilterColumn(val as any)}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder={trans.select_column} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nama_perusahaan">{trans.ownership}</SelectItem>
                            <SelectItem value="creator_name">{trans.submitted_by}</SelectItem>
                            <SelectItem value="nama_customer">{trans.customer_name}</SelectItem>
                            <SelectItem value="keterangan_status">{trans.status_description}</SelectItem>
                            <SelectItem value="status">{trans.review_status}</SelectItem>
                        </SelectContent>
                    </Select>

                    {isKeteranganStatus ? (
                        <Select value={filterValue} onValueChange={(val) => setFilterValue(val)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={trans.select_status} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="diinput">{trans.inputted}</SelectItem>
                                <SelectItem value="disubmit">{trans.submitted}</SelectItem>
                                <SelectItem value="diverifikasi">{trans.verified}</SelectItem>
                                <SelectItem value="diketahui">{trans.acknowledged}</SelectItem>
                                <SelectItem value="direview">{trans.reviewed}</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : isStatusReview ? (
                        <Select value={filterValue} onValueChange={(val) => setFilterValue(val)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={trans.select_review_status} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="approved">{trans.approved}</SelectItem>
                                <SelectItem value="rejected">{trans.rejected}</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            placeholder={trans.typing_keyword}
                            value={filterValue}
                            onChange={(event) => setFilterValue(event.target.value)}
                            className="max-w-sm"
                        />
                    )}
                    <Button variant="outline" className="h-auto" onClick={handleReset}>
                        {trans.reset}
                    </Button>

                    {/* <Select value={currentLocale} onValueChange={(val) => (window.location.href = `/lang/${val}`)}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder={trans.language} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="id">🇮🇩 {trans.indonesian}</SelectItem>
                            <SelectItem value="en">🇬🇧 {trans.english}</SelectItem>
                        </SelectContent>
                    </Select> */}

                    {userRole === 'supervisor' && (
                        <div>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as 'sudah' | 'belum' | '')}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder={trans.filter_status} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{trans.all}</SelectItem>
                                    <SelectItem value="sudah">{trans.already_know}</SelectItem>
                                    <SelectItem value="belum">{trans.not_yet_know}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 pt-4">
                    <DataTableViewOptions table={table} />
                    {userRole && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-9">{trans.add_shipment}</Button>
                            </DialogTrigger>

                            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[550px]">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">{trans.shipment_data}</DialogTitle>
                                    <DialogDescription className="hidden">Form input data shipment</DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    {/* Shipment Type Toggle */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold">{trans.shipment_type}</Label>
                                        <div className="flex w-full gap-2">
                                            <Button
                                                type="button"
                                                className={`w-1/2 ${shipmentType === 'Import' ? 'bg-black text-white hover:bg-gray-800' : 'border bg-white text-black hover:bg-gray-100'}`}
                                                onClick={() => setShipmentType('Import')}
                                            >
                                                {trans.import}
                                            </Button>
                                            <Button
                                                type="button"
                                                className={`w-1/2 ${shipmentType === 'Export' ? 'bg-black text-white hover:bg-gray-800' : 'border bg-white text-black hover:bg-gray-100'}`}
                                                onClick={() => setShipmentType('Export')}
                                            >
                                                {trans.export}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Input Dynamic Label (BL vs SI) */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold">{shipmentType === 'Import' ? trans.input_bl : trans.input_si}</Label>
                                        <Input
                                            placeholder={shipmentType === 'Import' ? trans.placeholder_bl : trans.placeholder_si}
                                            value={blNumber}
                                            onChange={(e) => setBlNumber(e.target.value)}
                                        />
                                    </div>

                                    {/* Input Customer */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold">{trans.input_customer}</Label>
                                        <Select value={selectedCustomer} onValueChange={setSelectedCustomer} disabled={isUserExternal}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={trans.select_customer_placeholder} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {externalCustomers.length > 0 ? (
                                                    externalCustomers.map((cust: any) => (
                                                        <SelectItem key={cust.id_customer} value={String(cust.id_customer)}>
                                                            {cust.nama}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <div className="p-2 text-center text-sm text-gray-500">{trans.data_not_found}</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {isUserExternal && <p className="text-[10px] text-gray-500">{trans.auto_selected_msg}</p>}
                                    </div>

                                    {/* NEW: Supervisor Assigns Staff */}
                                    {auth.user?.role === 'internal' && auth.user?.role_internal === 'supervisor' && (
                                        <div className="space-y-2">
                                            <Label className="font-semibold">{trans.assign_staff || 'Assign Staff'}</Label>
                                            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={trans.select_staff_placeholder || 'Select Staff'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {internalStaff.length > 0 ? (
                                                        internalStaff.map((staff: any) => (
                                                            <SelectItem key={staff.id_user} value={String(staff.id_user)}>
                                                                {staff.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 text-center text-sm text-gray-500">{trans.data_not_found}</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Data HS Code Section */}
                                    <div className="space-y-4 pb-4">
                                        <div className="flex items-center justify-between px-1">
                                            <Label className="text-base font-bold">{trans.hs_code_data}</Label>
                                            <ChevronUp className="h-4 w-4" />
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            {hsCodes.map((item, index) => (
                                                <div key={item.id} className="relative rounded-lg border bg-white p-4 shadow-sm">
                                                    {/* TOMBOL DELETE HS CODE */}
                                                    {index > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeHsCodeField(item.id)}
                                                            className="absolute top-3 right-3 text-red-500 transition-colors hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    <div className="grid gap-3 pt-1">
                                                        {/* Input HS Code */}
                                                        <div className="space-y-1">
                                                            <Label className="text-sm">{trans.input_hs_code}</Label>
                                                            <Input
                                                                placeholder={trans.placeholder_hs_code}
                                                                value={item.code}
                                                                onChange={(e) => updateHsCode(item.id, 'code', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* File Upload */}
                                                        <div className="space-y-2">
                                                            <Label className="text-sm">{trans.insw_link_ref}</Label>
                                                            {item.file ? (
                                                                <div className="relative flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-4">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateHsCode(item.id, 'file', null)}
                                                                        className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>

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
                                                                <div className="flex flex-col gap-3">
                                                                    {/* Tombol Pilih File */}
                                                                    <div className="relative">
                                                                        <Input
                                                                            type="file"
                                                                            className="hidden"
                                                                            id={`file-${item.id}`}
                                                                            accept="image/*"
                                                                            onChange={(e) =>
                                                                                updateHsCode(item.id, 'file', e.target.files?.[0] || null)
                                                                            }
                                                                        />
                                                                        <label
                                                                            htmlFor={`file-${item.id}`}
                                                                            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#1d64d0] text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                                                                        >
                                                                            <ImageIcon className="h-4 w-4" />
                                                                            {trans.choose_image}
                                                                        </label>
                                                                    </div>

                                                                    {/* Tombol Paste Clipboard */}
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
                                                                                if (!imageFound) alert(trans.alert_no_clipboard);
                                                                            } catch (err) {
                                                                                console.error(err);
                                                                                alert(trans.alert_clipboard_error);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Clipboard className="h-4 w-4" />
                                                                        {trans.paste_clipboard}
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
                                        {trans.add_another_hs}
                                    </Button>

                                    {/* Save Button */}
                                    <Button className="w-full bg-gray-200 text-black hover:bg-gray-300" onClick={handleSaveShipment}>
                                        {trans.save}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* --- MOBILE VIEW: CARD LAYOUT (Mirip Gambar) --- */}
            <div className="px-4 py-4 md:hidden">
                <div className="mb-4 flex w-full items-center justify-between gap-2">
                    <Select value={filterColumn} onValueChange={(val) => setFilterColumn(val as any)}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder={trans.select_column} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nama_perusahaan">{trans.ownership}</SelectItem>
                            <SelectItem value="creator_name">{trans.submitted_by}</SelectItem>
                            <SelectItem value="nama_customer">{trans.customer_name}</SelectItem>
                            <SelectItem value="keterangan_status">{trans.status_description}</SelectItem>
                            <SelectItem value="status">{trans.review_status}</SelectItem>
                        </SelectContent>
                    </Select>

                    {userRole && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" className="shrink-0">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                        </Dialog>
                    )}
                </div>
                {/* Filter Sederhana di Mobile */}
                <div className="mb-4 flex gap-2">
                    <Input
                        placeholder={trans.typing_keyword}
                        value={filterValue}
                        onChange={(event) => setFilterValue(event.target.value)}
                        className="w-full"
                    />

                    <Button variant="outline" className="h-auto" onClick={handleReset}>
                        {trans.reset}
                    </Button>
                </div>

                {/* Looping Data untuk Card View */}
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                        const original = row.original as any; // Cast ke any atau tipe data Shipping

                        // Formatting Tanggal
                        const dateObj = original.tanggal_status ? new Date(original.tanggal_status) : null;
                        const dateStr = dateObj
                            ? dateObj.toLocaleDateString(currentLocale === 'id' ? 'id-ID' : 'en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                              })
                            : '-';
                        const timeStr = dateObj
                            ? dateObj.toLocaleTimeString(currentLocale === 'id' ? 'id-ID' : 'en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                              })
                            : '';

                        // Logic Warna Jalur
                        const jalur = original.jalur ? original.jalur.toLowerCase() : '';
                        let jalurColor = 'text-gray-500';
                        if (jalur === 'hijau') jalurColor = 'text-green-600';
                        if (jalur === 'merah') jalurColor = 'text-red-600';
                        if (jalur === 'kuning') jalurColor = 'text-yellow-600';

                        return (
                            <div
                                key={row.id}
                                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                onClick={() => router.visit(`/shipping/${original.id}`)}
                            >
                                {/* Header Card: No SPK & Jalur */}
                                <div className="mb-2 flex items-center justify-between border-b pb-2">
                                    <span className="font-mono text-base font-medium text-gray-900">{original.spk_code || '-'}</span>
                                    <span className={`text-sm font-bold ${jalurColor}`}>{original.jalur || '-'}</span>
                                </div>

                                {/* Content Card */}
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500">{trans.customer_name}</p>
                                        <p className="font-bold text-gray-900">{original.nama_customer || '-'}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500">{trans.status_description}</p>
                                        <div className="text-sm text-gray-800">
                                            <span className="font-medium">{original.status_label || '-'}</span>
                                            {original.nama_user && (
                                                <>
                                                    {' '}
                                                    {trans.by} <strong>{original.nama_user}</strong>
                                                </>
                                            )}
                                            {dateObj && (
                                                <>
                                                    {' '}
                                                    {trans.at}{' '}
                                                    <strong>
                                                        {dateStr} {timeStr} WIB
                                                    </strong>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {isUserExternal && original.deadline_date && (
                                        <div className="mt-1 flex items-center gap-1">
                                            <span className="text-lg font-bold text-red-500">ⓘ</span>
                                            <span className="text-xs font-bold text-red-500">
                                                {trans.submit_before}{' '}
                                                {new Date(original.deadline_date).toLocaleDateString(currentLocale === 'id' ? 'id-ID' : 'en-GB', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                })}{' '}
                                                {trans.wib}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center text-gray-500">No results found.</div>
                )}
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
        </div>
    );
}
