// Role/ManageRoles/table/columns.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Perusahaan } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

export const columns = (onEditClick: (perusahaan: Perusahaan) => void, onDeleteClick: (id: number) => void): ColumnDef<Perusahaan>[] => [
    {
        accessorKey: 'nama_perusahaan',
        header: 'Nama Perusahaan',
        cell: ({ row }) => <div className="min-w-[150px] px-4 py-2">{row.original.nama_perusahaan}</div>,
    },
    {
        accessorKey: 'Notify_1',
        header: 'Notify 1',
        cell: ({ row }) => <Badge variant={row.original.notify_1 ? 'default' : 'secondary'}>{row.original.notify_1 || 'tidak ada'}</Badge>,
    },
    {
        accessorKey: 'Notify_2',
        header: 'Notify 2',
        cell: ({ row }) => <Badge variant={row.original.Notify_2 ? 'default' : 'secondary'}>{row.original.notify_2 || 'tidak ada'}</Badge>,
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const perusahaan = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditClick(perusahaan)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteClick(perusahaan.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
