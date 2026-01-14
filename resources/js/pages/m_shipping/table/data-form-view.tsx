/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzone } from '@/components/ResettableDropzone';
import { ResettableDropzoneImage } from '@/components/ResettableDropzoneImage';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router } from '@inertiajs/react';
import { ChevronDown, ChevronUp, CircleHelp, Play, Plus, Save, Search, Trash2, Undo2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEffect, useState } from 'react';

interface HsCodeItem {
    id: number;
    code: string;
    link: string | null;
    file?: File | null;
}

interface ShipmentData {
    id_spk: number;
    spkDate: string;
    type: string;
    siNumber: string;
    hsCodes: any[];
}

interface DocumentTrans {
    id: number;
    id_dokumen: number;
    upload_by: string;
    nama_file: string;
    url_path_file?: string;
    logs: string;
    link_url_video_file?: string;
    attribute: boolean;
    master_document?: {
        description_file?: string;
        link_path_example_file?: string;
        link_path_template_file?: string;
        link_url_video_file?: string;
    };
}

// Interface untuk Section Transaksional (dari DB Tenant)
interface SectionTrans {
    id: number; // ID unik section transaksi
    id_section: number; // ID referensi master section
    section_name: string;
    section_order: number;
    deadline: boolean;
    sla?: string | null;
    documents: DocumentTrans[];
}

interface MasterDocument {
    id_dokumen: number;
    nama_file: string;
    description_file?: string;
    link_path_example_file?: string;
    link_path_template_file?: string;
    link_url_video_file?: string;
    attribute: boolean;
}

interface Props {
    customer: any;
    shipmentDataProp: ShipmentData;
    sectionsTransProp: SectionTrans[];
    masterDocProp?: MasterDocument[];
}

//helper untuk video link youtube
const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

export default function ViewCustomerForm({
    customer,
    shipmentDataProp,
    sectionsTransProp, // Data Section Transaksional
    masterDocProp, // Data Master Document (opsional, untuk fallback help)
}: any) {
    const [tempFiles, setTempFiles] = useState<Record<number, string>>({});
    const [activeSection, setActiveSection] = useState<number | null>(null);
    const [isAdditionalDocsOpen, setIsAdditionalDocsOpen] = useState(true);
    const [isAdditionalSectionVisible, setIsAdditionalSectionVisible] = useState(false);
    const [isEditingHsCodes, setIsEditingHsCodes] = useState(false);
    const [hsCodes, setHsCodes] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false); // State untuk buka/tutup modal
    const [searchQuery, setSearchQuery] = useState(''); // State untuk search bar
    const [deadlineDate, setDeadlineDate] = useState(''); // State untuk tanggal deadline

    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [selectedHelpData, setSelectedHelpData] = useState<MasterDocument | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const videoUrl = selectedHelpData?.link_url_video_file;
    const videoId = videoUrl ? getYouTubeId(videoUrl) : null;
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

    useEffect(() => {
        if (helpModalOpen) {
            setIsVideoPlaying(false);
        }
    }, [helpModalOpen, selectedHelpData]);

    const [processingSectionId, setProcessingSectionId] = useState<number | null>(null);

    const [selectedAdditionalDocs, setSelectedAdditionalDocs] = useState<{ id: string; label: string }[]>([
        { id: 'fumigasi', label: 'Fumigasi' },
        { id: 'bpom', label: 'BPOM' },
    ]);

    const [tempSelectedDocs, setTempSelectedDocs] = useState<string[]>(['fumigasi', 'bpom']);

    const shipmentData = shipmentDataProp || {
        spkDate: '-',
        type: '-',
        spkNumber: '-',
        hsCodes: [],
    };

    const additionalDocsList = [
        { id: 'phyto', label: 'Phytosanitary' },
        { id: 'health', label: 'Health Certificate' },
        { id: 'fumigasi', label: 'Fumigasi' },
        { id: 'coo', label: 'COO' },
        { id: 'rekom', label: 'Surat Rekomendasi' },
        { id: 'bpom', label: 'BPOM' },
        { id: 'pi', label: 'PI' },
        { id: 'ls', label: 'LS' },
    ];

    const filteredDocs = additionalDocsList.filter((doc) => doc.label.toLowerCase().includes(searchQuery.toLowerCase()));

    const enableEditMode = () => {
        // Copy data dari props ke state edit form
        const initialData = shipmentData.hsCodes.map((item: any) => ({
            id: item.id || nanoid(),
            code: item.code,
            link: item.link,
            file: null, // Reset file input karena file object tidak bisa didapat dari backend
        }));

        // Jika kosong, sediakan 1 field kosong
        setHsCodes(initialData.length ? initialData : [{ id: nanoid(), code: '', link: '', file: null }]);
        setIsEditingHsCodes(true);
    };

    const cancelEditMode = () => {
        setIsEditingHsCodes(false);
        setHsCodes([]); // Reset state form
    };

    const updateHsCode = (id: any, field: keyof HsCodeItem, value: any) => {
        setHsCodes(hsCodes.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const removeHsCodeField = (id: any) => {
        setHsCodes(hsCodes.filter((item) => item.id !== id));
    };

    const addHsCodeField = () => {
        setHsCodes([...hsCodes, { id: nanoid(), code: '', link: null, file: null }]);
    };

    const handleSaveEdit = () => {
        const formData = {
            hs_codes: hsCodes.map((item) => ({
                id: typeof item.id === 'number' ? item.id : null, // Kirim ID jika numeric (lama), null jika string/nanoid (baru)
                code: item.code,
                file: item.file, // File object (jika baru diupload)
            })),
        };

        router.post(
            `/shipping/${shipmentData.id_spk}/update-hs-codes`, // URL sesuai route web.php
            formData,
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditingHsCodes(false);
                },
                onError: (errors) => {
                    alert('Gagal menyimpan perubahan. Periksa inputan Anda.');
                    console.error(errors);
                },
            },
        );
    };

    const handleOpenModal = () => {
        setSearchQuery(''); // Reset search saat dibuka
        setIsModalOpen(true);
    };

    const handleOpenHelp = (docTrans: DocumentTrans) => {
        let helpData = null;
        if (docTrans.master_document) {
            helpData = {
                nama_file: docTrans.nama_file,
                ...docTrans.master_document,
            };
        } else if (masterDocProp && Array.isArray(masterDocProp)) {
            const foundMaster = masterDocProp.find((m: any) => String(m.id_dokumen) === String(docTrans.id_dokumen));

            if (foundMaster) {
                helpData = foundMaster;
            }
        }

        if (!helpData) {
            helpData = {
                nama_file: docTrans.nama_file,
                link_path_example_file: null,
                link_path_template_file: null,
                link_url_video_file: null,
            };
        }

        setSelectedHelpData(helpData);
        setHelpModalOpen(true);
    };

    const handleEditSection = (sectionId: number) => {
        setActiveSection(sectionId === activeSection ? null : sectionId);
    };

    const handleSaveSection = (sectionId: number) => {
        // Set loading state
        setProcessingSectionId(sectionId);

        router.post(
            '/shipping/section-reminder',
            {
                section: sectionId,
                spk_id: shipmentData?.id_spk || shipmentData?.id || null,
                documents: tempFiles,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    // Tutup accordion dan matikan loading state setelah sukses
                    setActiveSection(null);
                    setProcessingSectionId(null);
                    // router.visit tidak perlu dipanggil manual jika return dari controller sudah benar (redirect/back)
                },
                onError: () => {
                    setProcessingSectionId(null); // Matikan loading jika error
                    alert('Gagal menyimpan data section.');
                },
            },
        );
    };

    const handleModalCheckboxChange = (id: string, checked: boolean) => {
        if (checked) setTempSelectedDocs([...tempSelectedDocs, id]);
        else setTempSelectedDocs(tempSelectedDocs.filter((item) => item !== id));
    };

    const handleSaveFromModal = () => {
        const newDocs = additionalDocsList.filter((opt) => tempSelectedDocs.includes(opt.id));
        setSelectedAdditionalDocs(newDocs);
        setIsModalOpen(false);
    };

    const handleFinalSave = () => {
        // Logika penyimpanan data ke database bisa diletakkan di sini
        // Menampilkan alert browser standar sesuai permintaan gambar
        window.alert('Document request saved');

        router.visit(`/customer/1`, { replace: true, preserveState: false });
    };

    return (
        <div className="w-full max-w-md bg-white p-4 font-sans text-sm text-gray-900">
            {/* --- SPK Created Card --- */}
            <div className="mb-5 rounded-lg border border-gray-200 p-3 shadow-sm">
                <div className="font-bold text-black">{shipmentData.status ? shipmentData.status.toUpperCase() : 'STATUS UNKNOWN'}</div>
                <div className="text-gray-600">{shipmentData.spkDate}</div>
            </div>

            {/* --- Shipment Details --- */}
            <div className="mb-6 space-y-1 pl-1">
                <div className="flex gap-1">
                    <span className="font-bold">Shipment Type :</span>
                    <span>{shipmentData.type}</span>
                </div>
                <div className="flex gap-1">
                    <span className="font-bold">SI :</span>
                    <span>{shipmentData.spkNumber}</span>
                </div>

                {/* HS Code Section */}
                <div className="flex gap-1">
                    <span className="font-bold whitespace-nowrap">HS - Code :</span>
                    <div className="flex w-full flex-col">
                        {isEditingHsCodes ? (
                            <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm duration-200">
                                <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-gray-200 bg-white shadow-xl">
                                    {/* Header Modal */}
                                    <div className="flex items-center justify-between border-b px-6 py-4">
                                        <h2 className="text-lg font-bold text-gray-900">Edit Data Hs Code</h2>
                                        <button onClick={cancelEditMode} className="text-gray-500 hover:text-gray-700">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* Body Modal (Scrollable) */}
                                    <div className="flex-1 space-y-4 overflow-y-auto p-6">
                                        <div className="flex flex-col gap-4">
                                            {hsCodes.map((item, index) => (
                                                <div key={item.id} className="relative rounded-lg border bg-white p-4 shadow-sm">
                                                    {/* TOMBOL DELETE ITEM */}
                                                    {hsCodes.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeHsCodeField(item.id)}
                                                            className="absolute top-3 right-3 text-red-500 transition-colors hover:text-red-700"
                                                            title="Hapus HS Code"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    <div className="grid gap-3 pt-1">
                                                        {/* Input HS Code */}
                                                        <div className="space-y-1">
                                                            <Label className="text-sm">Input HS Code</Label>
                                                            <Input
                                                                placeholder="Input Hs Code number"
                                                                value={item.code}
                                                                onChange={(e) => updateHsCode(item.id, 'code', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* File Upload */}
                                                        <div className="space-y-2">
                                                            <ResettableDropzoneImage
                                                                label="INSW Link reference"
                                                                isRequired={false}
                                                                // Jika ada file baru (item.file), jangan kirim existingFile
                                                                // Jika belum ada file baru, cek apakah ada link lama (item.link)
                                                                existingFile={
                                                                    !item.file && item.link
                                                                        ? {
                                                                              nama_file: item.link, // Nama file dari DB
                                                                              path: `/file/view/${item.link}`, // URL Preview dari Controller
                                                                          }
                                                                        : undefined
                                                                }
                                                                onFileChange={(file) => {
                                                                    // Update state saat file dipilih atau dihapus (file = null)
                                                                    updateHsCode(item.id, 'file', file);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Tombol Tambah Item Baru */}
                                            <Button variant="outline" onClick={addHsCodeField} className="w-full border-dashed">
                                                + Tambah HS Code Lain
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Footer Modal (Actions) */}
                                    <div className="flex gap-2 rounded-b-lg border-t bg-gray-50 px-6 py-4">
                                        <Button onClick={handleSaveEdit} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                                            <Save className="h-4 w-4" /> Simpan Perubahan
                                        </Button>
                                        <Button onClick={cancelEditMode} variant="destructive" className="flex-1 gap-2 text-white">
                                            <Undo2 className="h-4 w-4" /> Batal
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {shipmentData.hsCodes.length > 0 ? (
                                    shipmentData.hsCodes.map((item: any, index: number) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <span>{item.code}</span>

                                            {/* Link INSW */}
                                            {item.link ? (
                                                <a
                                                    href={`/file/view/${item.link}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-bold text-blue-600 hover:underline"
                                                    title="Lihat Dokumen INSW"
                                                >
                                                    [INSW]
                                                </a>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => alert('Tidak ada link/file INSW untuk kode ini.')}
                                                    className="cursor-not-allowed font-bold text-gray-400"
                                                    title="Tidak ada dokumen"
                                                >
                                                    [INSW]
                                                </button>
                                            )}

                                            {/* TOMBOL EDIT -> Trigger Edit Mode */}
                                            <button onClick={enableEditMode} className="text-gray-500 hover:text-black hover:underline">
                                                [edit]
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 italic">Tidak ada data HS Code</span>
                                        {/* Jika kosong, beri opsi untuk menambah */}
                                        <button onClick={enableEditMode} className="text-xs text-blue-500 hover:underline">
                                            + Tambah
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full space-y-3">
                {sectionsTransProp && sectionsTransProp.length > 0 ? (
                    sectionsTransProp.map((section: any) => {
                        const isOpen = activeSection === section.id; // Gunakan ID transaksi

                        return (
                            <div key={section.id_section} className="rounded-lg border border-gray-200 px-1 transition-all">
                                {/* Header Section */}
                                <div
                                    className="flex cursor-pointer items-center justify-between px-3 py-3"
                                    onClick={() => handleEditSection(section.id)}
                                >
                                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                                    <span className="text-sm font-bold text-gray-900 uppercase">{section.section_name}</span>
                                </div>

                                {/* Content Section */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 px-3 pt-2 pb-4">
                                        <div className="space-y-4">
                                            {/* Loop Documents Transaksional */}
                                            {section.documents && section.documents.length > 0 ? (
                                                section.documents.map((doc: DocumentTrans, idx: number) => (
                                                    <div key={doc.id} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-gray-800">
                                                            <span>
                                                                {idx + 1}. {doc.nama_file}
                                                            </span>
                                                            <CircleHelp
                                                                className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                                                                onClick={() => handleOpenHelp(doc)}
                                                            />
                                                        </div>
                                                        <div className="w-1/2 max-w-xs">
                                                            {' '}
                                                            <ResettableDropzone
                                                                label=""
                                                                isRequired={false}
                                                                existingFile={
                                                                    doc.url_path_file
                                                                        ? {
                                                                              nama_file: doc.nama_file,
                                                                              path: `/file/view/${doc.url_path_file}`,
                                                                          }
                                                                        : undefined
                                                                }
                                                                uploadConfig={{
                                                                    url: '/shipping/upload-temp',
                                                                    payload: {
                                                                        type: doc.nama_file,
                                                                        spk_code: shipmentData.spkNumber,
                                                                    },
                                                                }}
                                                                onFileChange={(file, response) => {
                                                                    if (response && response.success) {
                                                                        console.log('Upload success:', response);

                                                                        // SIMPAN TEMP PATH KE STATE
                                                                        // response.path berasal dari controller upload ('temp/filename.pdf')
                                                                        setTempFiles((prev) => ({
                                                                            ...prev,
                                                                            [doc.id]: response.path,
                                                                        }));
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-4 text-center text-xs text-gray-400 italic">
                                                    Belum ada dokumen di kategori ini.
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Section */}
                                        <div className="mt-8 flex items-center justify-between">
                                            <button
                                                onClick={handleOpenModal}
                                                className="flex items-center gap-2 text-sm font-bold text-gray-800 hover:text-black"
                                            >
                                                <div className="rounded border border-black p-0.5">
                                                    <Plus className="h-4 w-4" />
                                                </div>
                                                Add Another Document
                                            </button>

                                            <Button
                                                onClick={() => handleSaveSection(section.id)}
                                                disabled={processingSectionId === section.id}
                                                className="h-8 rounded bg-black px-8 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                                            >
                                                {processingSectionId === section.id ? 'Saving...' : 'Save'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="py-4 text-center text-gray-500">
                        <p>Memuat data dokumen transaksi...</p>
                        <p className="text-xs text-gray-400">Pastikan SPK sudah dibuat dan data master sudah tersalin.</p>
                    </div>
                )}
            </div>

            {/* --- Checkbox Request Additional Document --- */}
            <div className="mt-6 mb-4 flex items-center space-x-3 pl-1">
                <Checkbox
                    id="req_additional"
                    className="h-5 w-5 rounded border-2 border-black data-[state=checked]:bg-transparent data-[state=checked]:text-black"
                    checked={isAdditionalSectionVisible}
                    onCheckedChange={(checked) => setIsAdditionalSectionVisible(checked === true)}
                />
                <label htmlFor="req_additional" className="cursor-pointer text-sm leading-none font-bold">
                    REQUEST ADDITIONAL DOCUMENT
                </label>
            </div>

            {isAdditionalSectionVisible && (
                <div className="mb-8 rounded-lg border border-gray-200 px-1 shadow-sm">
                    {/* Menggunakan AccordionItem manual style agar sesuai gambar */}
                    <div
                        className="flex w-full cursor-pointer items-center justify-between px-3 py-3"
                        onClick={() => setIsAdditionalDocsOpen(!isAdditionalDocsOpen)}
                    >
                        <span className="text-sm font-bold uppercase">ADDITIONAL DOCUMENT</span>

                        {/* Ikon Chevron Dinamis */}
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 15 15"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isAdditionalDocsOpen ? 'rotate-180' : ''}`}
                        >
                            <path
                                d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
                                fill="currentColor"
                                fillRule="evenodd"
                                clipRule="evenodd"
                            ></path>
                        </svg>
                    </div>

                    {isAdditionalDocsOpen && (
                        <div className="px-3 pt-0 pb-4">
                            {/* --- Set Deadline Date --- */}
                            <div className="mb-6 space-y-2">
                                <label className="text-sm font-bold text-black">Set Deadline Date</label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        className="h-10 w-full border-gray-200 bg-white pr-10 text-gray-500"
                                        placeholder="Pick date"
                                        value={deadlineDate}
                                        onChange={(e) => setDeadlineDate(e.target.value)}
                                    />
                                    {/* <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-black" /> */}
                                </div>
                            </div>

                            {/* List Documents */}
                            <div className="space-y-4">
                                {selectedAdditionalDocs.map((doc, idx) => (
                                    <div key={doc.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-800">
                                            <span>
                                                {idx + 1}. {doc.label}
                                            </span>
                                            <CircleHelp className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700" />
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="h-8 w-28 rounded border-gray-200 bg-gray-50 text-xs font-normal text-gray-400 hover:bg-gray-100"
                                        >
                                            Upload here..
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Footer Buttons */}
                            <div className="mt-8 flex items-center justify-between">
                                <button onClick={handleOpenModal} className="flex items-center gap-2 text-sm font-medium text-black">
                                    <div className="rounded border border-black p-0.5">
                                        <Plus className="h-4 w-4" />
                                    </div>
                                    Add Another Document
                                </button>
                                <Button className="h-9 w-24 rounded bg-black text-xs font-bold text-white hover:bg-gray-800">Save</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-12 flex justify-end">
                <Button onClick={handleFinalSave} className="h-10 rounded-md bg-black px-8 text-sm font-bold text-white hover:bg-gray-800">
                    Save
                </Button>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-85 rounded-xl p-0 sm:max-w-100">
                    {/* Header Modal */}
                    <DialogHeader className="px-4 py-3">
                        <DialogTitle className="text-left text-lg font-bold">Additional Document</DialogTitle>
                    </DialogHeader>

                    {/* Search Bar */}
                    <div className="px-4 pb-2">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Ketik kata kunci...."
                                className="h-10 rounded-md border-gray-400 pl-9 focus-visible:border-black focus-visible:ring-0"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* List Pilihan Checkbox */}
                    <div className="max-h-75 overflow-y-auto px-4 py-2">
                        <div className="space-y-4">
                            {filteredDocs.map((doc) => (
                                <div key={doc.id} className="flex items-center space-x-3">
                                    {/* Checkbox agak besar (h-5 w-5) dan border lebih tebal (border-2) untuk mirip desain */}
                                    <Checkbox
                                        id={doc.id}
                                        className="h-5 w-5 rounded border-2 border-black data-[state=checked]:bg-transparent data-[state=checked]:text-black"
                                    />
                                    <label
                                        htmlFor={doc.id}
                                        className="text-base leading-none font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {doc.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Modal */}
                    <div className="flex flex-col items-center gap-3 border-t p-4 pt-2">
                        <button className="text-sm text-gray-500 hover:text-black hover:underline">See all..</button>
                        <Button
                            className="h-10 w-full rounded-md bg-black text-sm font-bold text-white hover:bg-gray-800"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
                <DialogContent className="max-w-85 rounded-xl p-5 sm:max-w-100">
                    <div className="mb-2">
                        {/* Judul Dokumen dari DB */}
                        <h2 className="text-xl leading-tight font-bold text-black">{selectedHelpData?.nama_file}</h2>
                    </div>

                    {/* Deskripsi dari DB */}
                    <div className="mb-4 text-sm leading-relaxed text-gray-700">
                        {selectedHelpData?.description_file || 'Tidak ada deskripsi tersedia untuk dokumen ini.'}
                    </div>

                    {selectedHelpData?.link_path_example_file && (
                        <div className="space-y-3">
                            <a href={selectedHelpData.link_path_example_file} target="_blank" rel="noreferrer" className="block w-full">
                                <Button
                                    variant="outline"
                                    className="w-full justify-center rounded-lg border-gray-300 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                >
                                    Download Contoh Dokumen {selectedHelpData.nama_file}
                                </Button>
                            </a>
                        </div>
                    )}

                    {/* Action Buttons (Download Template) */}
                    {selectedHelpData?.link_path_template_file && (
                        <div className="mb-5 space-y-3">
                            <a href={selectedHelpData.link_path_template_file} target="_blank" rel="noreferrer" className="block w-full">
                                <Button
                                    variant="outline"
                                    className="w-full justify-center rounded-lg border-gray-300 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                >
                                    Download Template {selectedHelpData.nama_file}
                                </Button>
                            </a>
                        </div>
                    )}

                    {/* Video Section */}
                    {videoUrl && videoId && (
                        <div>
                            <h3 className="mb-2 text-sm font-bold text-black">Video Tutorial</h3>
                            {/* Gunakan aspect-video untuk rasio 16:9 yang responsif */}
                            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-black">
                                {isVideoPlaying ? (
                                    // TAMPILAN 2: IFRAME PLAYER (Setelah tombol play diklik)
                                    <iframe
                                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        className="absolute inset-0 h-full w-full"
                                    ></iframe>
                                ) : (
                                    // TAMPILAN 1: THUMBNAIL PREVIEW & TOMBOL PLAY (Sebelum diklik)
                                    // Kita gunakan button biasa, bukan tag <a> lagi
                                    <button
                                        onClick={() => setIsVideoPlaying(true)}
                                        className="group relative flex h-full w-full items-center justify-center"
                                    >
                                        {/* Gambar Thumbnail dari YouTube */}
                                        {thumbnailUrl && (
                                            <img
                                                src={thumbnailUrl}
                                                alt="Video thumbnail"
                                                className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                                            />
                                        )}

                                        {/* Tombol Play di Tengah */}
                                        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md transition-transform group-hover:scale-110">
                                            <Play className="ml-1 h-6 w-6 fill-black text-black" />
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
