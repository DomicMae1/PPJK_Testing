/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzone } from '@/components/ResettableDropzone';
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
        href: '/document',
    },
];

interface MasterSection {
    id_section: number;
    section_name: string;
}

interface DocumentData {
    id_dokumen: number;
    id_section: number;
    nama_file: string;
    description_file: string;
    is_internal: boolean;
    attribute: boolean;
    link_path_example_file?: string;
    link_path_template_file?: string;
    link_url_video_file?: string;
    source?: 'master' | 'trans';
    section?: MasterSection;
}
interface PageProps {
    documents: DocumentData[];
    sections: MasterSection[];
    flash: { success?: string; error?: string };
    auth: { user: any };
    [key: string]: any;
}

export default function ManageDocuments() {
    const { documents, sections, flash, auth } = usePage<PageProps>().props;

    const userRole = auth.user?.roles?.[0]?.name;
    const isManager = ['manager', 'supervisor'].includes(userRole);
    const isAdmin = userRole === 'admin';

    // --- STATE EDIT ---
    const [openEdit, setOpenEdit] = useState(false);
    const [docIdToEdit, setDocIdToEdit] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        nama_file: '',
        id_section: '',
        description_file: '',
        is_internal: false,
        attribute: false,
        link_url_video_file: '',

        link_path_example_file: '',
        link_path_template_file: '',

        existing_example: null as { nama_file: string; path: string } | null,
        existing_template: null as { nama_file: string; path: string } | null,
    });

    // --- STATE DELETE ---
    const [openDelete, setOpenDelete] = useState(false);
    const [docIdToDelete, setDocIdToDelete] = useState<number | null>(null);
    const docToDelete = documents.find((d) => d.id_dokumen === docIdToDelete);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const handleEditDropzoneChange = (field: 'link_path_example_file' | 'link_path_template_file', response: any) => {
        if (response && (response.status === 'success' || response.path)) {
            setEditForm((prev) => ({ ...prev, [field]: response.path }));
        } else {
            setEditForm((prev) => ({ ...prev, [field]: '' }));
        }
    };

    // --- HANDLER EDIT ---
    const onEditClick = (id: number) => {
        const doc = documents.find((d) => d.id_dokumen === id) as any;

        if (doc) {
            // Validasi: Manager tidak boleh edit Master (Source 'master')
            if (isManager && doc.source === 'master') {
                toast.error('Anda tidak memiliki izin untuk mengedit Dokumen Master Pusat.');
                return;
            }

            setDocIdToEdit(id);
            setEditForm({
                nama_file: doc.nama_file,
                id_section: String(doc.id_section),
                description_file: doc.description_file || '',
                is_internal: Boolean(doc.is_internal),
                attribute: Boolean(doc.attribute),
                link_url_video_file: doc.link_url_video_file || '',

                link_path_example_file: '',
                link_path_template_file: '',

                existing_example: doc.link_path_example_file
                    ? { nama_file: 'File Contoh Saat Ini', path: doc.link_path_example_file } // Backend sudah mengirim URL lengkap
                    : null,

                existing_template: doc.link_path_template_file
                    ? { nama_file: 'File Template Saat Ini', path: doc.link_path_template_file } // Backend sudah mengirim URL lengkap
                    : null,
            });
            setOpenEdit(true);
        }
    };

    const handleEditBooleanChange = (field: 'is_internal' | 'attribute', value: boolean) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
    };

    const onConfirmEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (docIdToEdit) {
            const { existing_example, existing_template, ...payload } = editForm;
            router.post(
                `/document/${docIdToEdit}`,
                {
                    _method: 'put',
                    ...payload,
                },
                {
                    onSuccess: () => {
                        setOpenEdit(false);
                        setDocIdToEdit(null);
                        // toast handled by flash
                    },
                    onError: (err) => console.error(err),
                },
            );
        }
    };

    // --- HANDLER DELETE ---
    const onDeleteClick = (id: number) => {
        const doc = documents.find((d) => d.id_dokumen === id);
        if (doc) {
            // Validasi: Manager tidak boleh hapus Master
            if (isManager && doc.source === 'master') {
                toast.error('Anda tidak memiliki izin untuk menghapus Dokumen Master Pusat.');
                return;
            }
            setDocIdToDelete(id);
            setOpenDelete(true);
        }
    };

    const onConfirmDelete = () => {
        if (docIdToDelete) {
            router.delete(`/document/${docIdToDelete}`, {
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
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">{isAdmin ? 'Master Data Dokumen (Global)' : 'Data Dokumen Perusahaan (Internal)'}</h2>
                    <p className="text-sm text-gray-500">
                        {isAdmin
                            ? 'Dokumen yang dibuat di sini akan menjadi standar untuk semua perusahaan.'
                            : 'Dokumen ini khusus untuk perusahaan Anda.'}
                    </p>
                </div>

                <DataTable columns={columns(onEditClick, onDeleteClick)} data={documents} />
            </div>

            {/* --- MODAL EDIT --- */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Dokumen</DialogTitle>
                        <DialogDescription>
                            {isManager ? 'Mengubah dokumen internal perusahaan.' : 'Mengubah dokumen master global.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onConfirmEdit} className="space-y-4 py-2">
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

                        <div className="flex gap-2">
                            {/* === INPUT EDIT: Is Internal? === */}
                            <div>
                                <Label className="mb-2 block">Dokumen ini akan diupload oleh siapa</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={editForm.is_internal ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('is_internal', true)}
                                        className="w-20"
                                    >
                                        Internal
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!editForm.is_internal ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('is_internal', false)}
                                        className="w-20"
                                    >
                                        External
                                    </Button>
                                </div>
                            </div>

                            {/* === INPUT EDIT: Attribute? === */}
                            <div>
                                <Label className="mb-2 block">Mandatory atau tidak?</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={editForm.attribute ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('attribute', true)}
                                        className="w-20"
                                    >
                                        Ya
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!editForm.attribute ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('attribute', false)}
                                        className="w-20"
                                    >
                                        Tidak
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Link Video */}
                        <div>
                            <Label>Link Video</Label>
                            <Input
                                value={editForm.link_url_video_file}
                                onChange={(e) => setEditForm({ ...editForm, link_url_video_file: e.target.value })}
                                placeholder="https://youtube.com/..."
                            />
                        </div>

                        <div className="max-w-[250px] sm:max-w-[300px]">
                            <Label className="mb-2">Ganti Contoh File</Label>
                            <div className="w-full">
                                {' '}
                                {/* Wrapper untuk memastikan width penuh */}
                                <ResettableDropzone
                                    label="Upload Baru"
                                    isRequired={false}
                                    uploadConfig={{
                                        url: '/document/upload-temp',
                                        payload: { type: 'example', doc_name: editForm.nama_file },
                                    }}
                                    onFileChange={(file, response) => handleEditDropzoneChange('link_path_example_file', response)}
                                    existingFile={editForm.existing_example}
                                    // Tambahkan className jika komponen mendukung, untuk force align left
                                    className="w-full items-start justify-start text-left"
                                />
                            </div>
                            <p className="mt-1 text-[10px] text-gray-500">*Upload untuk mengganti file lama</p>
                        </div>

                        {/* Kolom 2: Template File */}
                        <div className="max-w-[250px] sm:max-w-[300px]">
                            <Label className="mb-2">Ganti Template File</Label>
                            <div className="w-full">
                                <ResettableDropzone
                                    label="Upload Baru"
                                    isRequired={false}
                                    uploadConfig={{
                                        url: '/document/upload-temp',
                                        payload: { type: 'template', doc_name: editForm.nama_file },
                                    }}
                                    onFileChange={(file, response) => handleEditDropzoneChange('link_path_template_file', response)}
                                    existingFile={editForm.existing_template}
                                    className="w-full items-start justify-start text-left"
                                />
                            </div>
                            <p className="mt-1 text-[10px] text-gray-500">*Upload untuk mengganti file lama</p>
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
                            <Button type="submit">Simpan Perubahan</Button>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Batal
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
