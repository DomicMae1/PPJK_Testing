// Customer/table/data-table.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Plus } from 'lucide-react';
import * as React from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    onCreateClick?: () => void;
}

export function DataTable<TData, TValue>({ columns, data, onCreateClick }: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const [filterValue, setFilterValue] = React.useState('');

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

    React.useEffect(() => {
        table.getColumn('nama_perusahaan')?.setFilterValue(filterValue);
    }, [filterValue, table]);

    return (
        <div>
            {/* --- HEADER --- */}
            <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
                {/* Input Pencarian (Full width di mobile, auto di desktop) */}
                <div className="flex w-full items-center gap-2 md:w-auto">
                    <Input
                        placeholder="Cari Nama Perusahaan..."
                        value={filterValue}
                        onChange={(event) => setFilterValue(event.target.value)}
                        className="w-full md:w-[300px]"
                    />
                    {/* Tombol Tambah di Mobile (Icon Only) */}
                    {onCreateClick && (
                        <Button size="icon" className="shrink-0 md:hidden" onClick={onCreateClick}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Tombol Aksi Desktop */}
                <div className="hidden items-center gap-2 md:flex">
                    <DataTableViewOptions table={table} />
                    {onCreateClick && (
                        <Button className="h-9" onClick={onCreateClick}>
                            <Plus className="mr-2 h-4 w-4" /> Tambah Customer
                        </Button>
                    )}
                </div>
            </div>

            {/* --- MOBILE VIEW (Card Layout) --- */}
            <div className="flex flex-col gap-4 md:hidden">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                        const original = row.original as any; // Cast ke any untuk akses properti customer

                        // Cari kolom actions jika ada untuk dirender manual
                        const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === 'actions');

                        return (
                            <div key={row.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                {/* Header Card: Nama Perusahaan & Actions */}
                                <div className="mb-3 flex items-start justify-between border-b pb-2">
                                    <div className="flex flex-col">
                                        <span className="text-base font-bold text-gray-900">{original.nama_perusahaan}</span>
                                        {original.kode_perusahaan && (
                                            <span className="mt-1 w-fit rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-500">
                                                {original.kode_perusahaan}
                                            </span>
                                        )}
                                    </div>
                                    {/* Render Actions Dropdown di pojok kanan atas */}
                                    {actionsCell && <div>{flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}</div>}
                                </div>

                                {/* Body Card: Informasi Kontak */}
                                <div className="space-y-2 text-sm text-gray-700">
                                    {original.email && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">Email</span>
                                            <span className="font-medium">{original.email}</span>
                                        </div>
                                    )}

                                    {original.no_telp && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">Telepon</span>
                                            <span>{original.no_telp}</span>
                                        </div>
                                    )}

                                    {original.alamat && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">Alamat</span>
                                            <span className="truncate">{original.alamat}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center text-gray-500">Data tidak ditemukan.</div>
                )}
            </div>

            {/* --- DESKTOP VIEW (Table Layout) --- */}
            <div className="hidden rounded-md border md:block">
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
                                    Data tidak ditemukan.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="py-4">
                <DataTablePagination table={table} />
            </div>
        </div>
    );
}
