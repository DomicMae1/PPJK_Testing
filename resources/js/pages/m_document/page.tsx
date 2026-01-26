/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Documents',
        href: '/master-documents',
    },
];

interface MasterSection {
    id_section: number;
    section_name: string;
}

interface MasterDocument {
    id_dokumen: number;
    id_section: number;
    nama_file: string;
    description_file: string;
    // Tambahkan properti lain sesuai kebutuhan (link, dll)
}

interface PageProps {
    documents: MasterDocument[];
    sections: MasterSection[];
    flash: { success?: string; error?: string };
    [key: string]: any;
}

export default function ManageDocuments() {
    const { documents, sections, flash } = usePage<PageProps>().props;

    // --- STATE EDIT ---
    const [openEdit, setOpenEdit] = useState(false);
    const [docIdToEdit, setDocIdToEdit] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        nama_file: '',
        id_section: '',
        description_file: '',
    });

    // --- STATE DELETE ---
    const [openDelete, setOpenDelete] = useState(false);
    const [docIdToDelete, setDocIdToDelete] = useState<number | null>(null);
    const docToDelete = documents.find((d) => d.id_dokumen === docIdToDelete);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    // --- HANDLER EDIT ---
    const onEditClick = (id: number) => {
        const doc = documents.find((d) => d.id_dokumen === id);
        if (doc) {
            setDocIdToEdit(id);
            setEditForm({
                nama_file: doc.nama_file,
                id_section: String(doc.id_section),
                description_file: doc.description_file || '',
            });
            setOpenEdit(true);
        }
    };

    const onConfirmEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (docIdToEdit) {
            router.put(`/master-documents/${docIdToEdit}`, editForm, {
                onSuccess: () => {
                    setOpenEdit(false);
                    setDocIdToEdit(null);
                    toast.success('Document updated successfully!');
                },
                onError: (err) => console.error(err),
            });
        }
    };

    // --- HANDLER DELETE ---
    const onDeleteClick = (id: number) => {
        setDocIdToDelete(id);
        setOpenDelete(true);
    };

    const onConfirmDelete = () => {
        if (docIdToDelete) {
            router.delete(`/master-documents/${docIdToDelete}`, {
                onSuccess: () => {
                    setOpenDelete(false);
                    setDocIdToDelete(null);
                    toast.success('Document deleted successfully!');
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Documents" />
            <div className="p-4">
                {/* Kirim data documents ke DataTable */}
                <DataTable columns={columns(onEditClick, onDeleteClick)} data={documents} />
            </div>

            {/* --- MODAL EDIT --- */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Master Document</DialogTitle>
                        <DialogDescription>Update document details.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onConfirmEdit} className="space-y-4">
                        <div>
                            <Label htmlFor="edit_nama_file">Nama Dokumen</Label>
                            <Input
                                id="edit_nama_file"
                                value={editForm.nama_file}
                                onChange={(e) => setEditForm({ ...editForm, nama_file: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit_id_section">Section</Label>
                            <Select value={editForm.id_section} onValueChange={(val) => setEditForm({ ...editForm, id_section: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map((sec) => (
                                        <SelectItem key={sec.id_section} value={String(sec.id_section)}>
                                            {sec.section_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="edit_desc">Deskripsi</Label>
                            <Textarea
                                id="edit_desc"
                                value={editForm.description_file}
                                onChange={(e) => setEditForm({ ...editForm, description_file: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
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

            {/* --- MODAL DELETE --- */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Dokumen</DialogTitle>
                        <DialogDescription>
                            Anda yakin ingin menghapus <strong>{docToDelete?.nama_file}</strong>? Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="destructive" onClick={onConfirmDelete}>
                            Hapus
                        </Button>
                        <DialogClose asChild>
                            <Button variant="secondary">Batal</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
