// Users/table/data-table.tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import * as React from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

interface Role {
    id: number;
    name: string;
}
interface Perusahaan {
    id: number;
    nama_perusahaan: string;
}

interface Customer {
    id: number;
    nama_perusahaan: string;
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
    const { roles, companies, customers } = usePage().props as unknown as {
        roles: Role[];
        companies: Perusahaan[];
        customers: Customer[];
    };

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const [openCreate, setOpenCreate] = React.useState(false);
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [passwordConfirmation, setPasswordConfirmation] = React.useState('');
    const [selectedRole, setSelectedRole] = React.useState<string>('');
    const [selectedRoleInternal, setSelectedRoleInternal] = React.useState<string>('');
    const [selectedCompany, setSelectedCompany] = React.useState<string>('');
    const [selectedCustomer, setSelectedCustomer] = React.useState<string>('');

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
        table.getColumn('name')?.setFilterValue(filterValue);
    }, [filterValue, table]);

    const onSubmitCreate = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Basic Validation (All fields required)
        if (!name || !email || !password || !passwordConfirmation) {
            console.error('All text fields are required.');
            alert('Harap isi semua kolom teks (Nama, Email, Password).');
            return;
        }

        if (password !== passwordConfirmation) {
            console.error('Password mismatch.');
            alert('Password dan konfirmasi password tidak cocok.');
            return;
        }

        // 2. Validate Company & User Type Selection
        if (!selectedCompany) {
            alert('Harap pilih Perusahaan.');
            return;
        }

        // Note: 'selectedRole' here refers to the User Type dropdown (Internal/External)
        if (!selectedRole) {
            alert('Harap pilih Tipe User (Internal / Eksternal).');
            return;
        }

        // 3. Specific Validation based on User Type
        let roleNameToSend = '';

        if (selectedRole === 'internal') {
            if (!selectedRoleInternal) {
                alert('Harap pilih Role Internal (Staff/Manager/Supervisor).');
                return;
            }
            // Find role name from ID
            const foundRole = roles.find((r) => String(r.id) === selectedRoleInternal);
            roleNameToSend = foundRole ? foundRole.name : '';
        } else if (selectedRole === 'external') {
            if (!selectedCustomer) {
                alert('Harap pilih Customer untuk user Eksternal.');
                return;
            }
            // Default role for external users
            roleNameToSend = 'customer';
        }

        // 4. Construct Payload
        const data = {
            name,
            email,
            password,
            password_confirmation: passwordConfirmation,

            // Relational Data
            id_perusahaan: Number(selectedCompany), // Always send company ID
            id_customer: selectedRole === 'external' ? Number(selectedCustomer) : null, // Send customer ID only if external

            // Role Data
            role: roleNameToSend, // Sends 'staff'/'manager'/'supervisor' OR 'customer'

            // Optional: Send type helper if backend needs it
            user_type: selectedRole,
        };

        console.log(data);

        // 5. Submit
        router.post('/users', data, {
            onSuccess: () => {
                setOpenCreate(false);
                // Reset Form State
                setName('');
                setEmail('');
                setPassword('');
                setPasswordConfirmation('');
                setSelectedCompany('');
                setSelectedRole(''); // Reset User Type
                setSelectedRoleInternal('');
                setSelectedCustomer('');
            },
            onError: (errors) => {
                console.error('❌ Error creating user:', errors);
                // Optional: Alert specific error if needed
                // alert('Gagal membuat user. Periksa input Anda.');
            },
        });
    };

    return (
        <div>
            <div className="flex items-center gap-2 pb-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Filter users..."
                        value={filterValue}
                        onChange={(event) => {
                            setFilterValue(event.target.value);
                        }}
                        className="max-w-sm"
                    />
                </div>

                <DataTableViewOptions table={table} />
                <Button className="h-9" onClick={() => setOpenCreate(true)}>
                    Add User
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

            <Dialog
                open={openCreate}
                onOpenChange={(open) => {
                    setOpenCreate(open);
                    if (!open) {
                        setName('');
                        setEmail('');
                        setPassword('');
                        setPasswordConfirmation('');
                        setSelectedRole('');
                        setSelectedCompany('');
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add User</DialogTitle>
                        <DialogDescription>Fill in the details to create a new user.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onSubmitCreate} className="space-y-4">
                        <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                            <Label htmlFor="company">Perusahaan</Label>
                            <Select onValueChange={setSelectedCompany} value={selectedCompany}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih perusahaan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.length > 0 ? (
                                        companies.map((company) => (
                                            <SelectItem key={company.id} value={String(company.id)}>
                                                {company.nama_perusahaan}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="text-muted-foreground p-2 text-sm">Tidak ada data perusahaan</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="role">Role</Label>
                            <Select onValueChange={setSelectedRole} value={selectedRole}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih jenis role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Kita hardcode value-nya menjadi string spesifik */}
                                    <SelectItem value="internal">Internal</SelectItem>
                                    <SelectItem value="external">Eksternal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Logika: Dropdown Role hanya muncul jika tipe user 'internal' */}
                        {selectedRole === 'internal' && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                <Label htmlFor="role">Role Internal</Label>
                                <Select onValueChange={setSelectedRoleInternal} value={selectedRoleInternal}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih role yang anda inginkan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles
                                            // 1. Filter hanya staff, manager, dan supervisor
                                            .filter((role) => ['staff', 'manager', 'supervisor'].includes(role.name))
                                            .map((role) => (
                                                <SelectItem key={role.id} value={String(role.id)}>
                                                    {/* Kapitalisasi huruf pertama agar rapi (opsional) */}
                                                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {selectedRole === 'external' && (
                            <div className="animate-in fade-in slide-in-from-top-1 mb-4 duration-300">
                                <Label htmlFor="customer">Customer</Label>
                                <Select onValueChange={setSelectedCustomer} value={selectedCustomer}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih Customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.length > 0 ? (
                                            customers.map((cust) => (
                                                <SelectItem key={cust.id} value={String(cust.id)}>
                                                    {cust.nama_perusahaan}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="text-muted-foreground p-2 text-sm">Tidak ada data customer</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" />
                        </div>
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                            />
                        </div>
                        <div>
                            <Label htmlFor="password_confirmation">Confirm Password</Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                placeholder="Confirm password"
                            />
                        </div>
                        <DialogFooter className="mt-8 sm:justify-start">
                            <Button type="submit">Create</Button>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Cancel
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
