import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // pastikan path sesuai
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';
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
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    // State lokal untuk filter
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

    // Sinkronkan filterValue dengan columnFilters
    React.useEffect(() => {
        table.getColumn('nama_perusahaan')?.setFilterValue(filterValue);
    }, [filterValue, table]);

    return (
        <div>
            <div className="flex items-center gap-2 pb-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Filter suppliers by name..."
                        value={filterValue}
                        onChange={(event) => {
                            setFilterValue(event.target.value);
                        }}
                        className="max-w-sm"
                    />
                </div>

                <DataTableViewOptions table={table} />
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
                            <Link href="/customer/share">
                                <Button variant="outline" className="w-full">
                                    Bagikan ke Customer
                                </Button>
                            </Link>
                        </div>
                        <DialogFooter>
                            <p className="text-muted-foreground text-xs">Anda dapat mengubah pilihan ini nanti.</p>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
        </div>
    );
}
