/* eslint-disable @typescript-eslint/no-explicit-any */
// Users/table/columns.tsx
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

export const columns = (onDeleteClick: (id: number) => void, onEditClick: (id: number) => void, t: Record<string, string>): ColumnDef<User>[] => [
    {
        accessorKey: 'name',
        header: t.label_name, // Mengambil dari trans_auth.label_name
        cell: ({ row }) => <div className="px-4 py-2">{row.original.name}</div>,
    },
    {
        accessorKey: 'email',
        header: t.label_email, // Mengambil dari trans_auth.label_email
        cell: ({ row }) => <div className="py-2">{row.original.email}</div>,
    },
    {
        accessorKey: 'roles',
        header: t.header_roles, // Perlu ditambahkan di file bahasa (lihat langkah 2)
        cell: ({ row }) => {
            const roles = row.original.roles;
            return <div className="py-2">{roles.map((role) => role.name).join(', ')}</div>;
        },
    },
    {
        id: 'actions',
        header: t.header_actions, // Opsional: Header untuk kolom aksi
        cell: ({ row }) => {
            const user = row.original;
            const userId = (user as any).id_user || user.id;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditClick(userId)}>
                            {t.btn_edit} {/* Perlu ditambahkan di file bahasa */}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteClick(userId)}>
                            {t.btn_delete} {/* Sudah ada di file bahasa */}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
