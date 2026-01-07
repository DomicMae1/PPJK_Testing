/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { router } from '@inertiajs/react';
import { ChevronDown, ChevronUp, CircleHelp, Play, Plus, Search } from 'lucide-react';
import { nanoid } from 'nanoid';
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from 'react';

interface HsCodeItem {
    id: number;
    code: string;
    link: string | null;
}

interface ShipmentData {
    id_spk: number;
    spkDate: string;
    type: string;
    siNumber: string;
    hsCodes: HsCodeItem[];
}

interface Props {
    customer: any;
    shipmentDataProp: ShipmentData; // Data dari Controller
}

export default function ViewCustomerForm({ customer, shipmentDataProp }: any) {
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [isAdditionalDocsOpen, setIsAdditionalDocsOpen] = useState(true);
    const [isAdditionalSectionVisible, setIsAdditionalSectionVisible] = useState(false);
    const [isEditingHsCodes, setIsEditingHsCodes] = useState(false);
    const [hsCodes, setHsCodes] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false); // State untuk buka/tutup modal
    const [searchQuery, setSearchQuery] = useState(''); // State untuk search bar
    const [deadlineDate, setDeadlineDate] = useState(''); // State untuk tanggal deadline

    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [selectedHelpData, setSelectedHelpData] = useState<any>(null);

    const [selectedAdditionalDocs, setSelectedAdditionalDocs] = useState<{ id: string; label: string }[]>([
        { id: 'fumigasi', label: 'Fumigasi' },
        { id: 'bpom', label: 'BPOM' },
    ]);

    const [tempSelectedDocs, setTempSelectedDocs] = useState<string[]>(['fumigasi', 'bpom']);

    const shipmentData = shipmentDataProp || {
        spkDate: '-',
        type: '-',
        siNumber: '-',
        hsCodes: [],
    };

    const sectionsConfig = [
        {
            id: 'ppjk',
            title: 'PPJK Document Request',
            documents: [
                { id: 1, name: 'Bill of Lading' },
                { id: 2, name: 'Invoice' },
                { id: 3, name: 'Packing List' },
                { id: 4, name: 'Polis Asuransi' },
                { id: 5, name: 'Surat Kuasa Kepabeanan' },
            ],
        },
        {
            id: 'shipping_line',
            title: 'Shipping Line',
            documents: [
                { id: 1, name: 'Dokumen 1' },
                { id: 2, name: 'Dokumen 2' },
                { id: 3, name: 'Dokumen 3' },
                { id: 4, name: 'Dokumen 4' },
                { id: 5, name: 'Dokumen 5' },
            ],
        },
        {
            id: 'pib_peb',
            title: 'PIB/PEB',
            documents: [
                { id: 1, name: 'Draft PIB' },
                { id: 2, name: 'PIB Final' },
            ],
        },
        {
            id: 'bill_payment',
            title: 'BILL PAYMENT',
            documents: [
                { id: 1, name: 'ID BILLING' },
                { id: 2, name: 'Bukti Pembayaran' },
                { id: 3, name: 'PIB Final' },
            ],
        },
        {
            id: 'result',
            title: 'RESULT',
            documents: [{ id: 1, name: 'SPPB' }],
        },
    ];

    const documentHelpInfo: Record<string, any> = {
        'Bill of Lading': {
            title: 'Bill of Lading (BL)',
            description:
                'Bill of Lading (B/L), adalah dokumen resmi yang berfungsi sebagai tanda terima barang, kontrak pengangkutan, dan bukti kepemilikan kargo.',
        },
        // Default content untuk dokumen lain jika belum didefinisikan
        default: {
            title: 'Informasi Dokumen',
            description: 'Ini adalah penjelasan singkat mengenai dokumen ini. Dokumen ini diperlukan untuk kelengkapan proses shipment.',
        },
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
        // --- LOGIKA SIMPAN PERUBAHAN KE BACKEND ---
        // Anda perlu membuat endpoint controller update untuk ini
        alert('Simulasi Simpan Data (Anda perlu implementasi ke controller update)');
        setIsEditingHsCodes(false);
        // router.post(...)
    };

    const handleOpenModal = () => {
        setSearchQuery(''); // Reset search saat dibuka
        setIsModalOpen(true);
    };

    const handleOpenHelp = (docName: string) => {
        const info = documentHelpInfo[docName] || {
            ...documentHelpInfo['default'],
            title: docName, // Fallback judul pakai nama dokumen
        };
        setSelectedHelpData(info);
        setHelpModalOpen(true);
    };

    const handleEditSection = (sectionId: string) => {
        setActiveSection(sectionId);
    };

    const handleSaveSection = () => {
        setActiveSection(null); // Menutup semua section
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
                <div className="font-bold text-black">DOCUMENT REQUESTED </div>
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
                    <span>{shipmentData.siNumber}</span>
                </div>

                {/* HS Code Section */}
                <div className="flex gap-1">
                    <span className="font-bold whitespace-nowrap">HS - Code :</span>
                    <div className="flex flex-col">
                        {shipmentData.hsCodes.length > 0 ? (
                            shipmentData.hsCodes.map(
                                (
                                    item: {
                                        code:
                                            | string
                                            | number
                                            | bigint
                                            | boolean
                                            | ReactElement<unknown, string | JSXElementConstructor<any>>
                                            | Iterable<ReactNode>
                                            | ReactPortal
                                            | Promise<
                                                  | string
                                                  | number
                                                  | bigint
                                                  | boolean
                                                  | ReactPortal
                                                  | ReactElement<unknown, string | JSXElementConstructor<any>>
                                                  | Iterable<ReactNode>
                                                  | null
                                                  | undefined
                                              >
                                            | null
                                            | undefined;
                                        link: string | null;
                                    },
                                    index: Key | null | undefined,
                                ) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span>{item.code}</span>

                                        {/* --- Tombol INSW Dinamis (Diperbaiki) --- */}
                                        {item.link ? (
                                            // KONDISI 1: Jika Link Ada -> Gunakan tag <a> sesuai referensi
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
                                            // KONDISI 2: Jika Link Kosong -> Gunakan button alert / disabled
                                            <button
                                                type="button"
                                                onClick={() => alert('Tidak ada link/file INSW untuk kode ini.')}
                                                className="cursor-not-allowed font-bold text-gray-400"
                                                title="Tidak ada dokumen"
                                            >
                                                [INSW]
                                            </button>
                                        )}

                                        <button className="text-gray-500 hover:text-black hover:underline">[edit]</button>
                                    </div>
                                ),
                            )
                        ) : (
                            <span className="text-gray-400 italic">Tidak ada data HS Code</span>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Accordion Menu Sections --- */}
            <div className="w-full space-y-3">
                {sectionsConfig.map((section) => {
                    // Cek apakah section ini sedang aktif (terbuka)
                    const isOpen = activeSection === section.id;

                    return (
                        <div key={section.id} className="rounded-lg border border-gray-200 px-1 transition-all">
                            {/* Header Section */}
                            <div className="flex items-center justify-between px-3 py-3" onClick={() => handleEditSection(section.id)}>
                                {/* Judul (Statik, tidak bisa diklik untuk toggle) */}
                                {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                                <span className="text-sm font-bold text-gray-900">{section.title}</span>
                            </div>

                            {/* Content Section (Hanya dirender jika isOpen === true) */}
                            {isOpen && (
                                <div className="border-t border-gray-100 px-3 pt-2 pb-4">
                                    <div className="space-y-4">
                                        {section.documents.map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-gray-800">
                                                    <span>
                                                        {doc.id}. {doc.name}
                                                    </span>
                                                    <CircleHelp
                                                        className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                                                        onClick={() => handleOpenHelp(doc.name)}
                                                    />
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

                                    {/* Footer Section: Add & Save Buttons */}
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

                                        {/* Tombol Save akan menutup section */}
                                        <Button
                                            onClick={handleSaveSection}
                                            className="h-8 rounded bg-black px-8 text-xs font-bold text-white hover:bg-gray-800"
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
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
                    {/* Header: Title & Close Button included by Default DialogContent, but we customize title */}
                    <div className="mb-2">
                        <h2 className="text-xl leading-tight font-bold text-black">{selectedHelpData?.title}</h2>
                    </div>

                    {/* Description */}
                    <div className="mb-4 text-sm leading-relaxed text-gray-700">{selectedHelpData?.description}</div>

                    {/* Action Buttons (Templates) */}
                    <div className="mb-5 space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-center rounded-lg border-gray-300 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        >
                            Contoh Dokumen Template {selectedHelpData?.title}
                        </Button>
                    </div>

                    {/* Video Section */}
                    <div>
                        <h3 className="mb-2 text-sm font-bold text-black">Video</h3>
                        <div className="flex h-40 w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm transition-transform hover:scale-110">
                                <Play className="ml-1 h-5 w-5 fill-black text-black" />
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
