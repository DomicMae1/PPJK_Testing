/* eslint-disable @typescript-eslint/no-explicit-any */
// Users/ManageUsers.tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Role, User, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Users',
        href: '/users',
    },
];

export default function ManageUsers() {
    const { users, roles } = usePage().props as unknown as { users: User[]; roles: Role[] };
    const [openDelete, setOpenDelete] = useState(false);
    const [userIdToDelete, setUserIdToDelete] = useState<number | null>(null);
    const [openEdit, setOpenEdit] = useState(false);
    const [userIdToEdit, setUserIdToEdit] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editRoleInternalId, setEditRoleInternalId] = useState<string>('');
    const [isExternalUser, setIsExternalUser] = useState(false);

    const userToDelete = users.find((u) => (u.id_user || u.id) === userIdToDelete);

    const onEditClick = (id: number) => {
        // Cari user berdasarkan ID
        const user = users.find((u) => (u.id_user || u.id) === id);

        if (user) {
            setUserIdToEdit(id);
            setEditName(user.name);
            setEditEmail(user.email);

            // Cek Tipe User
            if (user.role === 'eksternal') {
                setIsExternalUser(true);
                setEditRoleInternalId('');
            } else {
                setIsExternalUser(false);

                // --- LOGIC BARU (Mengambil dari user.roles) ---
                // Cek apakah array roles ada dan tidak kosong
                if (user.roles && user.roles.length > 0) {
                    // Ambil nama role pertama (misal: 'staff')
                    const userRoleName = user.roles[0].name;

                    // Cari role di list master 'roles' yang namanya cocok (case-insensitive)
                    const matchingRole = roles.find((r) => r.name.toLowerCase() === userRoleName.toLowerCase());

                    // Set ID role ke state (untuk dropdown select)
                    setEditRoleInternalId(matchingRole ? String(matchingRole.id) : '');

                    // Debugging
                    // console.log("Role found:", matchingRole);
                } else {
                    // Fallback jika tidak ada role
                    setEditRoleInternalId('');
                }
            }
            setOpenEdit(true);
        }
    };

    const onDeleteClick = (id: number) => {
        setUserIdToDelete(id);
        setOpenDelete(true);
    };

    const onConfirmDelete = () => {
        if (userIdToDelete !== null) {
            router.delete(`/users/${userIdToDelete}`, {
                onSuccess: () => {
                    setOpenDelete(false);
                    setUserIdToDelete(null);
                    toast.success('User deleted successfully!');
                },
                onError: (errors) => {
                    console.error('❌ Error saat menghapus user:', errors);
                    toast.error('Failed to delete user.');
                },
            });
        }
    };

    const onConfirmEdit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editName || !editEmail) {
            toast.error('Nama dan Email wajib diisi.');
            return;
        }

        // Jika Internal, wajib pilih role
        if (!isExternalUser && !editRoleInternalId) {
            toast.error('Role wajib dipilih untuk user Internal.');
            return;
        }

        // Cari nama role berdasarkan ID yang dipilih (hanya untuk internal)
        let roleNameToSend = null;
        if (!isExternalUser) {
            const selectedRoleObj = roles.find((r) => String(r.id) === editRoleInternalId);
            roleNameToSend = selectedRoleObj ? selectedRoleObj.name : null;
        }

        const data = {
            name: editName,
            email: editEmail,
            // Jika external -> kirim null atau tidak diupdate
            // Jika internal -> kirim nama role baru
            role_internal: isExternalUser ? null : roleNameToSend,
        };

        if (userIdToEdit !== null) {
            router.put(`/users/${userIdToEdit}`, data, {
                onSuccess: () => {
                    setOpenEdit(false);
                    resetEditState();
                    toast.success('User updated successfully!');
                },
                onError: (errors: any) => {
                    console.error('❌ Error saat mengedit user:', errors);
                    if (errors.email) toast.error(errors.email);
                    else toast.error('Failed to update user.');
                },
            });
        }
    };

    const resetEditState = () => {
        setUserIdToEdit(null);
        setEditName('');
        setEditEmail('');
        setEditRoleInternalId('');
        setIsExternalUser(false);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Users" />
            <div className="p-4">
                <DataTable columns={columns(onDeleteClick, onEditClick)} data={users} />
            </div>

            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus Data</DialogTitle>
                        <div className="mt-2">
                            Data <span className="font-bold text-white">{userToDelete?.email ?? 'Tidak ditemukan'}</span> akan dihapus. Apakah Anda
                            yakin?
                        </div>
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

            <Dialog
                open={openEdit}
                onOpenChange={(open) => {
                    setOpenEdit(open);
                    if (!open) resetEditState();
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update the details of the user.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onConfirmEdit} className="space-y-4">
                        {/* 1. Nama */}
                        <div>
                            <Label htmlFor="edit_name">Name</Label>
                            <Input id="edit_name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter name" />
                        </div>

                        {/* 2. Email */}
                        <div>
                            <Label htmlFor="edit_email">Email</Label>
                            <Input
                                id="edit_email"
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="Enter email"
                            />
                        </div>

                        {/* 3. Role Internal (Hanya muncul jika user INTERNAL) */}
                        {!isExternalUser && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                <Label htmlFor="edit_role">Role Internal</Label>
                                <Select onValueChange={setEditRoleInternalId} value={editRoleInternalId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles
                                            // Filter hanya role internal yang relevan
                                            .filter((role) => ['staff', 'manager', 'supervisor'].includes(role.name))
                                            .map((role) => (
                                                <SelectItem key={role.id} value={String(role.id)}>
                                                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Info Text untuk Eksternal */}
                        {isExternalUser && (
                            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                                User ini adalah <strong>Eksternal (Customer)</strong>. Tidak ada role di sini.
                            </div>
                        )}

                        <DialogFooter className="sm:justify-start">
                            <Button type="submit">Save Changes</Button>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Cancel
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
