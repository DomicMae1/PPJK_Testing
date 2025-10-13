import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppLayout from '@/layouts/app-layout';
import { Role, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Role',
        href: '/role-manager',
    },
];

export default function ManageRoles() {
    const { roles, permissions, flash } = usePage().props as unknown as {
        roles: Role[];
        permissions: { [key: string]: string[] };
        flash: { success?: string; error?: string };
    };

    const [openDelete, setOpenDelete] = useState(false);
    const [openForm, setOpenForm] = useState(false);
    const [roleIdToDelete, setRoleIdToDelete] = useState<number | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const onDeleteClick = (id: number) => {
        setRoleIdToDelete(id);
        setOpenDelete(true);
    };

    const onEditClick = (role: Role) => {
        setSelectedRole(role);
        setRoleName(role.name);
        setSelectedPermissions(role.permissions.map((perm) => perm.name));
        setOpenForm(true);
    };

    const isAllSelected = (model: string) => {
        const modelPermissions = permissions[model];
        return modelPermissions.every((perm) => selectedPermissions.includes(perm));
    };

    const isSomeSelected = (model: string) => {
        const modelPermissions = permissions[model];
        return modelPermissions.some((perm) => selectedPermissions.includes(perm)) && !isAllSelected(model);
    };

    const handleSelectAllChange = (model: string, checked: boolean) => {
        const modelPermissions = permissions[model];

        if (checked) {
            const newPermissions = Array.from(new Set([...selectedPermissions, ...modelPermissions]));
            setSelectedPermissions(newPermissions);
        } else {
            const newPermissions = selectedPermissions.filter((perm) => !modelPermissions.includes(perm));
            setSelectedPermissions(newPermissions);
        }
    };

    const onConfirmDelete = () => {
        if (roleIdToDelete) {
            router.delete(`/role-manager/${roleIdToDelete}`, {
                onSuccess: () => {
                    setOpenDelete(false);
                    setRoleIdToDelete(null);
                },
                onError: (errors) => {
                    console.error('❌ Error saat menghapus role:', errors);
                },
            });
        }
    };

    const onSubmit = () => {
        const data = {
            name: roleName,
            permissions: selectedPermissions,
        };

        if (selectedRole) {
            router.put(`/role-manager/${selectedRole.id}`, data, {
                onSuccess: () => {
                    setOpenForm(false);
                    setSelectedRole(null);
                    setRoleName('');
                    setSelectedPermissions([]);
                },
                onError: (errors) => {
                    console.error('❌ Error saat mengupdate role:', errors);
                },
            });
        } else {
            router.post('/role-manager', data, {
                onSuccess: () => {
                    setOpenForm(false);
                    setRoleName('');
                    setSelectedPermissions([]);
                },
                onError: (errors) => {
                    console.error('❌ Error saat menambah role:', errors);
                },
            });
        }
    };

    const handlePermissionChange = (permission: string) => {
        if (selectedPermissions.includes(permission)) {
            setSelectedPermissions(selectedPermissions.filter((perm) => perm !== permission));
        } else {
            setSelectedPermissions([...selectedPermissions, permission]);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Roles" />
            <div className="p-4">
                <DataTable columns={columns(onEditClick, onDeleteClick)} data={roles} />
            </div>

            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent className="max-w-[90vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Role</DialogTitle>
                        <div className="mt-2">Role ini akan dihapus. Apakah Anda yakin?</div>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-start">
                        <Button type="button" variant="destructive" onClick={onConfirmDelete}>
                            Hapus
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Close
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={openForm} onOpenChange={setOpenForm}>
                <DialogContent className="max-w-[90vw] sm:max-w-md md:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedRole ? 'Edit Role' : 'Add Role'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="roleName">Role Name</Label>
                            <Input id="roleName" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Enter role name" />
                        </div>
                        <div>
                            <Label>Permissions</Label>
                            <ScrollArea className="w-full rounded-md border">
                                <div className="max-h-80 p-4">
                                    {Object.entries(permissions).map(([model, modelPermissions]) => {
                                        return (
                                            <div key={model} className="mb-6">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h3 className="font-semibold capitalize">{model.replace(/-/g, ' ')}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`select-all-${model}`}
                                                            checked={isAllSelected(model)}
                                                            indeterminate={isSomeSelected(model)}
                                                            onCheckedChange={(checked) => handleSelectAllChange(model, !!checked)}
                                                        />
                                                        <Label htmlFor={`select-all-${model}`} className="cursor-pointer">
                                                            Select All
                                                        </Label>
                                                    </div>
                                                </div>

                                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
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
                                                                <Label htmlFor={permission} className="max-w-[150px] cursor-pointer truncate">
                                                                    {action}
                                                                </Label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button type="button" onClick={onSubmit}>
                            {selectedRole ? 'Update' : 'Create'}
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Cancel
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
