import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
    const { permissions } = usePage().props as unknown as {
        permissions: { [key: string]: string[] };
    };

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const [openCreate, setOpenCreate] = React.useState(false);
    const [roleName, setRoleName] = React.useState('');
    const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);

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

    const handlePermissionChange = (permission: string) => {
        if (selectedPermissions.includes(permission)) {
            setSelectedPermissions(selectedPermissions.filter((perm) => perm !== permission));
        } else {
            setSelectedPermissions([...selectedPermissions, permission]);
        }
    };

    const onSubmitCreate = () => {
        const data = {
            name: roleName,
            permissions: selectedPermissions,
        };

        router.post('/role-manager', data, {
            onSuccess: () => {
                setOpenCreate(false);
                setRoleName('');
                setSelectedPermissions([]);
            },
            onError: (errors) => {
                console.error('❌ Error saat menambah role:', errors);
            },
        });
    };

    return (
        <div>
            <div className="flex items-center gap-2 pb-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Filter roles..."
                        value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                        onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
                        className="max-w-sm"
                    />
                </div>

                <DataTableViewOptions table={table} />
                <Button className="h-9" onClick={() => setOpenCreate(true)}>
                    Add Role
                </Button>
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

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Role</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="roleName">Role Name</Label>
                            <Input id="roleName" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Enter role name" />
                        </div>
                        <div>
                            <Label>Permissions</Label>
                            <ScrollArea className="w-full rounded-md border">
                                <div className="max-h-80 space-y-8 p-4 2xl:max-h-96">
                                    {Object.entries(permissions).map(([model, modelPermissions]) => (
                                        <div key={model}>
                                            <h3 className="font-semibold capitalize">{model.replace(/-/g, ' ')}</h3>
                                            <div className="mt-2 grid grid-cols-3 gap-2">
                                                {modelPermissions.map((permission) => {
                                                    const action = permission.split('-')[0];
                                                    return (
                                                        <div key={permission} className="flex items-center">
                                                            <Checkbox
                                                                id={permission}
                                                                checked={selectedPermissions.includes(permission)}
                                                                onCheckedChange={() => handlePermissionChange(permission)}
                                                                className="mr-2"
                                                            />
                                                            <label htmlFor={permission} className="cursor-pointer">
                                                                {action}
                                                            </label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button type="button" onClick={onSubmitCreate}>
                            Create
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Cancel
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
