/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzone } from '@/components/ResettableDropzone';
import { ResettableDropzoneImage } from '@/components/ResettableDropzoneImage';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, ChevronDown, ChevronUp, CircleHelp, FileText, Play, Plus, Save, Search, Trash2, Undo2, X } from 'lucide-react';
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
    spkNumber: string;
    shipmentType: string;
    is_internal: boolean;
    internal_can_upload?: boolean; // Added
    spkDate: string;
    type: string;
    siNumber: string;
    hsCodes: any[];
}

interface DocumentTrans {
    id: number;
    id_dokumen: number;
    id_spk: number;
    id_section: number;
    upload_by: string;
    nama_file: string;
    url_path_file?: string;
    logs: string;
    link_url_video_file?: string;
    attribute: boolean;
    created_at: string;
    master_document?: {
        id_dokumen: number;
        nama_dokumen: string;
        description_file?: string;
        link_path_example_file?: string;
        link_path_template_file?: string;
        link_url_video_file?: string;
    };
    verify?: boolean | null;
    kuota_revisi?: number;
    correction_attachment?: boolean;
    correction_description?: string;
    correction_attachment_file?: string;
    is_internal?: boolean; // Added
}

// Interface untuk Section Transaksional (dari DB Tenant)
interface SectionTrans {
    id: number; // ID unik section transaksi
    id_section: number; // ID referensi master section
    section_name: string;
    section_order: number;
    deadline: boolean;
    deadline_date?: string | null; // NEW: Tanggal deadline per section
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
    userRole, // NEW: User role for role-based visibility
}: any) {
    const { props } = usePage();
    const trans = props.trans_general as Record<string, string>;
    const currentLocale = props.locale as string;

    // Check if user is internal (not external)
    const isInternalUser = userRole !== 'eksternal';

    const [tempFiles, setTempFiles] = useState<Record<number, string>>({});
    const [activeSection, setActiveSection] = useState<number | null>(null);
    const [isAdditionalDocsOpen, setIsAdditionalDocsOpen] = useState(true);
    const [isAdditionalSectionVisible, setIsAdditionalSectionVisible] = useState(false);
    const [isEditingHsCodes, setIsEditingHsCodes] = useState(false);
    const [hsCodes, setHsCodes] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false); // State untuk buka/tutup modal
    const [searchQuery, setSearchQuery] = useState(''); // State untuk search bar
    const [deadlineDate, setDeadlineDate] = useState(''); // State untuk tanggal deadline (additional docs)

    // NEW: Deadline Date Feature States
    const [useUnifiedDeadline, setUseUnifiedDeadline] = useState(true); // Checkbox: apply same deadline to all
    const [globalDeadlineDate, setGlobalDeadlineDate] = useState(''); // Global deadline (garis kuning)
    const [sectionDeadlines, setSectionDeadlines] = useState<Record<number, string>>({}); // Per-section deadlines (garis orange)

    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [selectedHelpData, setSelectedHelpData] = useState<MasterDocument | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const videoUrl = selectedHelpData?.link_url_video_file;
    const videoId = videoUrl ? getYouTubeId(videoUrl) : null;
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

    // Verification states
    const [verifyingDocId, setVerifyingDocId] = useState<number | null>(null);
    const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [rejectionNote, setRejectionNote] = useState('');
    const [rejectionFile, setRejectionFile] = useState<File | null>(null);
    const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);

    // Batch Verification State
    const [pendingVerifications, setPendingVerifications] = useState<number[]>([]);

    // Batch Rejection State
    type PendingRejection = { docId: number; note: string; file: File | null };
    const [pendingRejections, setPendingRejections] = useState<PendingRejection[]>([]);

    // Expandable History State (External/Internal)
    const [openHistoryIds, setOpenHistoryIds] = useState<number[]>([]);

    // History Modal states
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedHistoryDocs, setSelectedHistoryDocs] = useState<DocumentTrans[]>([]);
    const [selectedHistoryTitle, setSelectedHistoryTitle] = useState('');

    useEffect(() => {
        if (helpModalOpen) {
            setIsVideoPlaying(false);
        }
    }, [helpModalOpen, selectedHelpData]);

    // NEW: Realtime Updates Listener
    useEffect(() => {
        if (shipmentDataProp?.spkNumber) {
            if ((window as any).Echo && shipmentDataProp.id_spk) {
                console.log(`Listening to channel: shipping.${shipmentDataProp.id_spk}`);
                (window as any).Echo.private(`shipping.${shipmentDataProp.id_spk}`).listen('ShippingDataUpdated', (e: any) => {
                    console.log('Realtime update received:', e);
                    // Reload only the necessary data props
                    router.reload({ only: ['sectionsTransProp', 'shipmentDataProp'] });
                });
            }
        }

        return () => {
            if ((window as any).Echo && shipmentDataProp.id_spk) {
                (window as any).Echo.leave(`shipping.${shipmentDataProp.id_spk}`);
            }
        };
    }, [shipmentDataProp]);

    // Initialize deadline states from database data
    useEffect(() => {
        if (sectionsTransProp && sectionsTransProp.length > 0) {
            const deadlinesFromDb: Record<number, string> = {};
            let hasAnyDeadline = false;
            let firstDeadline = '';
            let allSameDeadline = true;

            sectionsTransProp.forEach((section: SectionTrans) => {
                if (section.deadline_date) {
                    const dateStr = String(section.deadline_date);

                    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                    const dateValue = match ? `${match[1]}-${match[2]}-${match[3]}` : '';

                    if (dateValue) {
                        deadlinesFromDb[section.id] = dateValue;

                        if (!hasAnyDeadline) {
                            firstDeadline = dateValue;
                            hasAnyDeadline = true;
                        } else if (dateValue !== firstDeadline) {
                            allSameDeadline = false;
                        }
                    }
                }
            });

            // Set per-section deadlines from DB
            if (Object.keys(deadlinesFromDb).length > 0) {
                setSectionDeadlines(deadlinesFromDb);
            }

            // If all sections have same deadline, set unified mode
            if (hasAnyDeadline && allSameDeadline) {
                setGlobalDeadlineDate(firstDeadline);
                setUseUnifiedDeadline(true);
            } else if (hasAnyDeadline) {
                // Different deadlines = individual mode
                setUseUnifiedDeadline(false);
            }
        }
    }, [sectionsTransProp]);

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
        is_created_by_internal: false,
    };

    console.log(shipmentData.is_created_by_internal);

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

    // Verification Handlers
    const handleVerify = (documentId: number) => {
        // Toggle pending verification logic
        setPendingVerifications((prev) => {
            if (prev.includes(documentId)) {
                return prev.filter((id) => id !== documentId);
            } else {
                return [...prev, documentId];
            }
        });
    };

    const handleOpenReject = (documentId: number) => {
        setRejectingDocId(documentId);
        setRejectionModalOpen(true);
        setRejectionNote('');
        setRejectionFile(null);
    };

    const handleSubmitReject = async () => {
        if (!rejectingDocId || !rejectionNote.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        // Store rejection in local state instead of sending immediately
        setPendingRejections((prev) => {
            // Remove existing rejection for this doc if exists (overwrite)
            const filtered = prev.filter((r) => r.docId !== rejectingDocId);
            return [
                ...filtered,
                {
                    docId: rejectingDocId,
                    note: rejectionNote,
                    file: rejectionFile,
                },
            ];
        });

        // Also remove from pending verifications if it was there
        setPendingVerifications((prev) => prev.filter((id) => id !== rejectingDocId));

        setRejectionModalOpen(false);
        setRejectionNote('');
        setRejectionFile(null);
        setRejectingDocId(null);
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

    const handleSaveSection = async (sectionId: number) => {
        // 1. Set loading
        setProcessingSectionId(sectionId);

        console.log('Current Temp Files State:', tempFiles); // Debugging Step 1

        // 2. Ambil data section saat ini
        const currentSection = sectionsTransProp.find((s: SectionTrans) => s.id === sectionId);

        if (!currentSection || !currentSection.documents) {
            alert('Section tidak ditemukan atau kosong.');
            setProcessingSectionId(null);
            return;
        }

        // --- VALIDASI: Pastikan semua dokumen yang sudah diupload (ada url_path_file) sudah dinilai ---
        const uploadedDocs = currentSection.documents.filter((doc) => doc.url_path_file);

        // Filter dokumen yang belum dinilai:
        // - verify === null (belum dinilai dari DB)
        // - status verify != false (karena kalau false berarti rejected, sudah dinilai)
        // - TIDAK ada di pendingVerifications (berarti belum dicentang 'Accept')
        // - TIDAK ada di pendingRejections (berarti belum submit Reject)
        const unassessedDocs = uploadedDocs.filter((doc: DocumentTrans) => {
            // SKIP validation if internal_can_upload is set (Auto-verified)
            if (shipmentData.internal_can_upload) return false;

            const isAlreadyAssessed = doc.verify !== null; // True if Checked (true) or Rejected (false)
            const isPendingAccept = pendingVerifications.includes(doc.id);
            const isPendingReject = pendingRejections.some((r: PendingRejection) => r.docId === doc.id);

            // Jika sudah assessed DB, OK.
            if (isAlreadyAssessed) return false;

            // Jika belum assessed DB, tapi ada di pendingAccept/Reject, OK.
            if (isPendingAccept || isPendingReject) return false;

            // Sisanya: Belum assessed DB dan belum di centang -> Masalah.
            return true;
        });

        if (unassessedDocs.length > 0) {
            alert(
                `Harap verifikasi (Accept) atau tolak (Reject) semua dokumen yang telah diupload pada section ini.\n\nDokumen belum dinilai: ${unassessedDocs.length}`,
            );
            setProcessingSectionId(null);
            return;
        }

        // 3. Filter dokumen yang memiliki file temp
        const filesToProcess = currentSection.documents.filter((doc: DocumentTrans) => {
            const hasFile = tempFiles[doc.id];
            return hasFile;
        });

        console.log('Files to process:', filesToProcess); // Debugging Step 2

        try {
            // 4. Process documents (Batch Optimized)
            if (filesToProcess.length > 0) {
                const attachmentsPayload = filesToProcess.map(doc => ({
                    path: tempFiles[doc.id],
                    document_id: doc.id,
                    type: doc.nama_file // Filename/Type
                }));

                const response = await axios.post('/shipping/batch-process-attachments', {
                    spk_id: shipmentData.id_spk,
                    section_name: currentSection.section_name,
                    attachments: attachmentsPayload
                });

                console.log('Batch Process Success:', response.data);

                // Bersihkan state tempFiles
                const newTempFiles = { ...tempFiles };
                filesToProcess.forEach((doc) => delete newTempFiles[doc.id]);
                setTempFiles(newTempFiles);
            }

            // 5. BATCH VERIFICATION (NEW)
            // Cari dokumen di section ini yang masuk daftar pendingVerifications
            const docsToVerify = currentSection.documents.filter((doc) => pendingVerifications.includes(doc.id)).map((doc) => doc.id);

            if (docsToVerify.length > 0) {
                await axios.post('/shipping/batch-verify', {
                    spk_id: shipmentData.id_spk,
                    section_id: sectionId, // Untuk konteks notifikasi
                    verified_ids: docsToVerify,
                });

                // Hapus ID yang sudah diverifikasi dari pendingVerifications
                setPendingVerifications((prev) => prev.filter((id) => !docsToVerify.includes(id)));
            }

            // 6. PROCESS PENDING REJECTIONS (NEW)
            // Cari dokumen di section ini yang ada di pendingRejections
            const rejectionsToProcess = currentSection.documents
                .filter((doc) => pendingRejections.some((r) => r.docId === doc.id))
                .map((doc) => {
                    return pendingRejections.find((r) => r.docId === doc.id);
                })
                .filter((r): r is PendingRejection => r !== undefined);

            if (rejectionsToProcess.length > 0) {
                await Promise.all(
                    rejectionsToProcess.map(async (rejection) => {
                        const formData = new FormData();
                        formData.append('correction_description', rejection.note);
                        if (rejection.file) {
                            formData.append('correction_file', rejection.file);
                        }

                        await axios.post(`/shipping/${rejection.docId}/reject`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        });
                    }),
                );

                // Hapus yang sudah diproses
                const processedIds = rejectionsToProcess.map((r) => r.docId);
                setPendingRejections((prev) => prev.filter((r) => !processedIds.includes(r.docId)));
            }

            // 7. Save deadline untuk section ini
            const deadlineValue = useUnifiedDeadline ? globalDeadlineDate : sectionDeadlines[sectionId] || null;

            if (deadlineValue) {
                await axios.post('/shipping/update-deadline', {
                    spk_id: shipmentData.id_spk,
                    unified: false, // Individual mode - hanya section ini
                    section_deadlines: { [sectionId]: deadlineValue },
                });
            }

            // 8. Success message & Reload
            const parts = [];
            if (filesToProcess.length > 0) parts.push(`${filesToProcess.length} dokumen diproses`);
            if (docsToVerify.length > 0) parts.push(`${docsToVerify.length} dokumen diverifikasi`);
            if (rejectionsToProcess.length > 0) parts.push(`${rejectionsToProcess.length} dokumen ditolak`);
            if (deadlineValue) parts.push('deadline tersimpan');

            if (parts.length > 0) {
                // alert(`Berhasil: ${parts.join(', ')}`); // Removed as per request
                router.reload({ only: ['sectionsTransProp'] }); // Reload data
            } else {
                // alert('Tidak ada perubahan untuk disimpan.');
            }

            // Close accordion after success
            setActiveSection(null);
        } catch (error: any) {
            console.error('Error saving section:', error);

            if (error.response && error.response.data) {
                alert(`Gagal: ${error.response.data.message || JSON.stringify(error.response.data)}`);
            } else {
                alert('Terjadi kesalahan saat menyimpan.');
            }
        } finally {
            setProcessingSectionId(null);
        }
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

    // Helper: Group documents for rendering
    // Returns array of objects { current: Doc, history: Doc[] }
    const processDocumentsForRender = (docs: DocumentTrans[]) => {
        const groups = new Map<number, DocumentTrans[]>();

        // 1. Group by id_dokumen
        docs.forEach((doc) => {
            if (!groups.has(doc.id_dokumen)) {
                groups.set(doc.id_dokumen, []);
            }
            groups.get(doc.id_dokumen)?.push(doc);
        });

        const result: { current: DocumentTrans; history: DocumentTrans[] }[] = [];

        groups.forEach((groupDocs) => {
            // 2. Sort by ID descending (newest first)
            groupDocs.sort((a, b) => b.id - a.id);

            // 3. Current is the first one (latest)
            const current = groupDocs[0];

            // 4. History is the rest
            const history = groupDocs.slice(1);

            // Populate history for BOTH Internal and External
            result.push({ current, history });
        });

        return result;
    };

    const handleOpenHistory = (docs: DocumentTrans[]) => {
        if (docs.length === 0) return;
        const title = docs[0].master_document?.nama_dokumen || docs[0].nama_file;
        setSelectedHistoryTitle(title);
        setSelectedHistoryDocs(docs);
        setHistoryModalOpen(true);
    };

    const handleFinalSave = async () => {
        try {
            // --- VALIDATION: Check for unassessed documents across ALL sections ---
            const allUnassessedDocs: DocumentTrans[] = [];

            // SKIP validation if internal_can_upload is set (Auto-verified)
            if (!shipmentData.internal_can_upload) {
                sectionsTransProp.forEach((section: SectionTrans) => {
                    if (section.documents) {
                        const uploadedDocs = section.documents.filter((doc) => doc.url_path_file);
                        uploadedDocs.forEach((doc) => {
                            const isAlreadyAssessed = doc.verify !== null;
                            const isPendingAccept = pendingVerifications.includes(doc.id);
                            const isPendingReject = pendingRejections.some((r: PendingRejection) => r.docId === doc.id);

                            if (!isAlreadyAssessed && !isPendingAccept && !isPendingReject) {
                                allUnassessedDocs.push(doc);
                            }
                        });
                    }
                });
            }

            if (allUnassessedDocs.length > 0) {
                alert(
                    `Terdapat ${allUnassessedDocs.length} dokumen yang belum dinilai (Accept/Reject). Harap verifikasi semua dokumen yang telah diupload sebelum menyimpan.`,
                );
                return;
            }

            // 1. Process all documents from all sections that have temp files
            const allDocsToProcess: { doc: any; sectionId: number }[] = [];

            sectionsTransProp.forEach((section: SectionTrans) => {
                if (section.documents) {
                    section.documents.forEach((doc) => {
                        if (tempFiles[doc.id]) {
                            allDocsToProcess.push({ doc, sectionId: section.id });
                        }
                    });
                }
            });

            // Process all documents (Batch Optimized)
            if (allDocsToProcess.length > 0) {
                // Determine Last Section Name
                const lastProcessed = allDocsToProcess[allDocsToProcess.length - 1];
                const lastSection = sectionsTransProp.find((s) => s.id === lastProcessed.sectionId);
                const sectionName = lastSection ? lastSection.section_name : 'Document';

                const attachmentsPayload = allDocsToProcess.map(({ doc }) => ({
                    path: tempFiles[doc.id],
                    document_id: doc.id,
                    type: doc.nama_file
                }));

                const response = await axios.post('/shipping/batch-process-attachments', {
                    spk_id: shipmentData.id_spk,
                    section_name: sectionName,
                    attachments: attachmentsPayload
                });

                console.log('Batch Process Success:', response.data);

                // Clear temp files
                setTempFiles({});
            }

            // 2. BATCH VERIFICATION (NEW - GLOBAL)
            if (pendingVerifications.length > 0) {
                await axios.post('/shipping/batch-verify', {
                    spk_id: shipmentData.id_spk,
                    section_id: null, // Global save, maybe generic or null
                    verified_ids: pendingVerifications,
                });

                // Clear pending verifications
                setPendingVerifications([]);
            }

            // 3. BATCH REJECTION (NEW - GLOBAL)
            if (pendingRejections.length > 0) {
                console.log('Processing Global Rejections:', pendingRejections.length);
                const rejectionPromises = pendingRejections.map(async (rejection) => {
                    const formData = new FormData();
                    formData.append('correction_description', rejection.note);
                    if (rejection.file) {
                        formData.append('correction_file', rejection.file);
                    }

                    try {
                        await axios.post(`/shipping/${rejection.docId}/reject`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        });
                    } catch (err) {
                        console.error(`Failed to reject doc ${rejection.docId}`, err);
                        throw err; // Re-throw to be caught by outer catch
                    }
                });

                await Promise.all(rejectionPromises);

                // Clear pending rejections
                setPendingRejections([]);
            }

            // 4. Save all deadlines
            await axios.post('/shipping/update-deadline', {
                spk_id: shipmentData.id_spk,
                unified: useUnifiedDeadline,
                global_deadline: useUnifiedDeadline ? globalDeadlineDate : null,
                section_deadlines: !useUnifiedDeadline ? sectionDeadlines : {},
            });

            // 5. Success message
            const parts = [];
            if (allDocsToProcess.length > 0) parts.push(`${allDocsToProcess.length} dokumen diproses`);
            if (pendingVerifications.length > 0) parts.push(`${pendingVerifications.length} dokumen diverifikasi`);
            if (pendingRejections.length > 0) parts.push(`${pendingRejections.length} dokumen ditolak`);
            if (globalDeadlineDate || Object.keys(sectionDeadlines).length > 0) parts.push('deadline');

            // window.alert(`Berhasil menyimpan: ${parts.length > 0 ? parts.join(', ') : 'Data tersimpan'} `); // Removed as per request

            // Navigate back
            router.visit(`/shipping/${shipmentData.id_spk}`, { replace: true, preserveState: false });
        } catch (error: any) {
            console.error('Error in final save:', error);
            alert('Gagal menyimpan: ' + (error.response?.data?.message || error.message));
        }
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
                    <span className="font-bold">{trans.shipment_type} :</span>
                    <span>{shipmentData.type}</span>
                </div>
                <div className="flex gap-1">
                    <span className="font-bold">
                        {shipmentData.type === 'Export' ? trans.si || 'SI' : shipmentData.type === 'Import' ? trans.bl || 'BL' : trans.spk || 'SPK'} :
                    </span>
                    <span>{shipmentData.spkNumber}</span>
                </div>

                {/* HS Code Section */}
                <div className="flex gap-1">
                    <span className="font-bold whitespace-nowrap">{trans.hs_code} :</span>
                    <div className="flex w-full flex-col">
                        {isEditingHsCodes ? (
                            <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm duration-200">
                                <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-gray-200 bg-white shadow-xl">
                                    {/* Header Modal */}
                                    <div className="flex items-center justify-between border-b px-6 py-4">
                                        <h2 className="text-lg font-bold text-gray-900">{trans.edit_hs_data}</h2>
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
                                                            title={trans.delete_hs || 'Hapus HS Code'}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    <div className="grid gap-3 pt-1">
                                                        {/* Input HS Code */}
                                                        <div className="space-y-1">
                                                            <Label className="text-sm">{trans.input_hs_code}</Label>
                                                            <Input
                                                                placeholder={trans.input_hs_code}
                                                                value={item.code}
                                                                onChange={(e) => updateHsCode(item.id, 'code', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* File Upload */}
                                                        <div className="space-y-2">
                                                            <ResettableDropzoneImage
                                                                label={trans.insw_link_ref}
                                                                isRequired={false}
                                                                existingFile={
                                                                    !item.file && item.link
                                                                        ? {
                                                                            nama_file: item.link,
                                                                            path: `/file/view/${item.link}`,
                                                                        }
                                                                        : undefined
                                                                }
                                                                onFileChange={(file) => {
                                                                    updateHsCode(item.id, 'file', file);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Tombol Tambah Item Baru */}
                                            <Button variant="outline" onClick={addHsCodeField} className="w-full border-dashed">
                                                + {trans.add_another_hs}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Footer Modal (Actions) */}
                                    <div className="flex gap-2 rounded-b-lg border-t bg-gray-50 px-6 py-4">
                                        <Button onClick={handleSaveEdit} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                                            <Save className="h-4 w-4" /> {trans.save_changes}
                                        </Button>
                                        <Button onClick={cancelEditMode} variant="destructive" className="flex-1 gap-2 text-white">
                                            <Undo2 className="h-4 w-4" /> {trans.cancel}
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
                                            {item.link ? (
                                                <a
                                                    href={`/file/view/${item.link}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-bold text-blue-600 hover:underline"
                                                >
                                                    [INSW]
                                                </a>
                                            ) : (
                                                <button type="button" className="cursor-not-allowed font-bold text-gray-400">
                                                    [INSW]
                                                </button>
                                            )}
                                            <button onClick={enableEditMode} className="text-gray-500 hover:text-black hover:underline">
                                                {trans.edit || '[edit]'}
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 italic">-</span>
                                        <button onClick={enableEditMode} className="text-xs text-blue-500 hover:underline">
                                            + {trans.add_another_hs}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* NEW: Global Deadline Section - ONLY for Internal Users */}
            {isInternalUser && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-3">
                        {/* Garis Kuning: Global Deadline Field */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-bold whitespace-nowrap text-gray-700">{trans.set_deadline}:</label>
                            <Input
                                type="date"
                                className={`h-9 flex-1 border-gray-300 ${!useUnifiedDeadline ? 'cursor-not-allowed bg-gray-100 opacity-50' : 'bg-white'}`}
                                value={globalDeadlineDate}
                                onChange={(e) => setGlobalDeadlineDate(e.target.value)}
                                disabled={!useUnifiedDeadline}
                            />
                        </div>

                        {/* Garis Hijau: Checkbox Apply to All */}
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="unified_deadline"
                                className="h-4 w-4 rounded border-2 border-gray-400 data-[state=checked]:bg-black data-[state=checked]:text-white"
                                checked={useUnifiedDeadline}
                                onCheckedChange={(checked) => setUseUnifiedDeadline(checked === true)}
                            />
                            <label htmlFor="unified_deadline" className="cursor-pointer text-sm text-gray-600">
                                {trans.apply_deadline_all}
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full space-y-3">
                {sectionsTransProp && sectionsTransProp.length > 0 ? (
                    sectionsTransProp.map((section: any) => {
                        const isOpen = activeSection === section.id; // Gunakan ID transaksi

                        return (
                            <div key={section.id_section} className="rounded-lg border border-gray-200 px-1 transition-all">
                                <div className="flex cursor-pointer items-center gap-2 px-3 py-3" onClick={() => handleEditSection(section.id)}>
                                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                                    <div className="flex flex-1 flex-col">
                                        <span className="text-sm font-bold text-gray-900 uppercase">{section.section_name}</span>
                                        {!isInternalUser && section.deadline && section.deadline_date && (
                                            <div className="mt-1 flex items-center gap-1">
                                                <span className="text-lg font-bold text-red-500">ⓘ</span>
                                                <span className="text-xs font-bold text-red-500">
                                                    {trans.submit_before}{' '}
                                                    {new Date(section.deadline_date).toLocaleDateString(currentLocale === 'id' ? 'id-ID' : 'en-GB', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                    })}{' '}
                                                    {trans.wib}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="border-t border-gray-100 px-3 pt-2 pb-4">
                                        {isInternalUser && (
                                            <div className="mb-4 flex items-center gap-3">
                                                <label className="text-sm font-medium whitespace-nowrap text-gray-600">{trans.deadline}:</label>
                                                <Input
                                                    type="date"
                                                    className={`h-8 flex-1 border-gray-200 text-sm ${useUnifiedDeadline ? 'cursor-not-allowed bg-gray-100 opacity-50' : 'bg-white'}`}
                                                    value={useUnifiedDeadline ? globalDeadlineDate : sectionDeadlines[section.id] || ''}
                                                    onChange={(e) => {
                                                        if (!useUnifiedDeadline) {
                                                            setSectionDeadlines((prev) => ({
                                                                ...prev,
                                                                [section.id]: e.target.value,
                                                            }));
                                                        }
                                                    }}
                                                    disabled={useUnifiedDeadline}
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {section.documents && section.documents.length > 0 ? (
                                                processDocumentsForRender(section.documents).map((item, idx: number) => {
                                                    const doc = item.current;
                                                    const allVersions = [doc, ...item.history];
                                                    const validVersions = allVersions.filter((v) => v.url_path_file);
                                                    const hasHistory = validVersions.length > 1;

                                                    const isVerified = doc.verify === true;
                                                    const isRejected = doc.verify === false;
                                                    const isPending = doc.verify === null;
                                                    const isPendingVerification = pendingVerifications.includes(doc.id);
                                                    const isPendingRejection = pendingRejections.some((r) => r.docId === doc.id);
                                                    const quotaExceeded = doc.kuota_revisi !== undefined && doc.kuota_revisi <= 0;

                                                    const toggleHistory = (id: number) => {
                                                        setOpenHistoryIds((prev) =>
                                                            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
                                                        );
                                                    };

                                                    // Logic Determinations
                                                    // 1. Check SPK level flag
                                                    const isSpkInternalUpload = shipmentData.internal_can_upload ?? false; // Fallback to false

                                                    // 2. Define permissions
                                                    let canUpload = false;
                                                    let canVerify = false;

                                                    if (isSpkInternalUpload) {
                                                        // Mode: Internal handles EVERYTHING, Auto-verified
                                                        canUpload = isInternalUser; // Internal ALWAYS shoots
                                                        canVerify = false; // No manual verification needed (auto-verified)
                                                    } else {
                                                        // Mode: Normal (Bidirectional)
                                                        // doc.is_internal = true (1) -> Internal Uploads, External Verifies
                                                        // doc.is_internal = false (0) -> External Uploads, Internal Verifies
                                                        canUpload = (isInternalUser && doc.is_internal) || (!isInternalUser && !doc.is_internal);
                                                        canVerify = (isInternalUser && !doc.is_internal) || (!isInternalUser && doc.is_internal);
                                                    }

                                                    return (
                                                        <div
                                                            key={doc.id}
                                                            className="relative flex flex-col gap-2 border-b border-gray-100 py-3 last:border-0"
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                {/* LEFT COLUMN: Name & History */}
                                                                <div className="flex flex-1 flex-col gap-1">
                                                                    <div className="flex items-center gap-2 text-gray-800">
                                                                        <span className="text-sm font-medium">
                                                                            {idx + 1}. {doc.master_document?.nama_dokumen || doc.nama_file}
                                                                        </span>
                                                                        <CircleHelp
                                                                            className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                                                                            onClick={() => handleOpenHelp(doc)}
                                                                        />

                                                                        {/* Status Badge - Visible if I cannot verify (so I am uploader or viewer) */}
                                                                        {!canVerify && doc.url_path_file && (
                                                                            <>
                                                                                {isVerified && (
                                                                                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                                                                                        {trans.verified}
                                                                                    </span>
                                                                                )}
                                                                                {isRejected && (
                                                                                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                                                                        {trans.rejected}
                                                                                    </span>
                                                                                )}
                                                                                {isPending && (
                                                                                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
                                                                                        {trans.pending}
                                                                                    </span>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>

                                                                    {/* File & History UI */}
                                                                    {doc.url_path_file ? (
                                                                        <div className="ml-5">
                                                                            {/* Collapsible Trigger */}
                                                                            <button
                                                                                onClick={() => toggleHistory(doc.id)}
                                                                                className="flex items-center gap-1 rounded bg-black px-2 py-1 text-xs text-white transition-colors hover:bg-gray-800"
                                                                            >
                                                                                <FileText className="h-3 w-3" />
                                                                                {trans.latest_file || 'Latest File'}
                                                                                {openHistoryIds.includes(doc.id) ? (
                                                                                    <ChevronUp className="ml-1 h-3 w-3" />
                                                                                ) : (
                                                                                    <ChevronDown className="ml-1 h-3 w-3" />
                                                                                )}
                                                                            </button>

                                                                            {/* History List */}
                                                                            {openHistoryIds.includes(doc.id) && (
                                                                                <div className="mt-2 flex flex-col gap-1 border-l-2 border-gray-200 pl-2">
                                                                                    {validVersions.map((v, vIdx) => {
                                                                                        const versionNumber = validVersions.length - vIdx;
                                                                                        const isLatest = vIdx === 0;
                                                                                        return (
                                                                                            <div
                                                                                                key={v.id}
                                                                                                className="flex items-center gap-2 text-xs"
                                                                                            >
                                                                                                <span className="font-bold text-gray-500">
                                                                                                    v{versionNumber}
                                                                                                </span>
                                                                                                <a
                                                                                                    href={`/file/view/${v.url_path_file}`}
                                                                                                    target="_blank"
                                                                                                    className={`hover:underline ${isLatest ? 'font-bold text-black' : 'text-gray-600'}`}
                                                                                                >
                                                                                                    {v.nama_file || trans.document}
                                                                                                </a>
                                                                                                <span className="text-[10px] text-gray-400">
                                                                                                    {new Date(v.created_at).toLocaleDateString()}
                                                                                                </span>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="ml-5 text-xs text-gray-400 italic">
                                                                            {trans.no_file || 'No file uploaded'}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Verifier Actions: Accept / Reject */}
                                                                {canVerify && doc.url_path_file && (
                                                                    <div className="flex items-center gap-4">
                                                                        {/* Accept */}
                                                                        <div className="flex flex-col items-center">
                                                                            <span
                                                                                className={`text-[10px] font-bold ${isVerified || isPendingVerification ? 'text-green-600' : 'text-gray-400'}`}
                                                                            >
                                                                                {trans.accept || 'Accept'}
                                                                            </span>
                                                                            <Checkbox
                                                                                checked={isVerified || isPendingVerification}
                                                                                onCheckedChange={() => handleVerify(doc.id)}
                                                                                className={`data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600`}
                                                                                disabled={!isPending}
                                                                            />
                                                                        </div>

                                                                        {/* Reject */}
                                                                        <div className="flex flex-col items-center">
                                                                            <span
                                                                                className={`text-[10px] font-bold ${isRejected || isPendingRejection ? 'text-red-600' : 'text-gray-400'}`}
                                                                            >
                                                                                {trans.reject || 'Reject'}
                                                                            </span>
                                                                            <Checkbox
                                                                                checked={isRejected || isPendingRejection}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) handleOpenReject(doc.id);
                                                                                }}
                                                                                className={`data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600`}
                                                                                disabled={!isPending}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Uploader UI: Upload & Info Column -> RIGHT SIDE */}
                                                                {canUpload && (
                                                                    <div className="flex w-1/2 max-w-xs flex-col items-end gap-2">
                                                                        {/* Upload Zone */}
                                                                        {!doc.url_path_file || (!isPending && !quotaExceeded) ? (
                                                                            <ResettableDropzone
                                                                                label=""
                                                                                isRequired={false}
                                                                                existingFile={
                                                                                    tempFiles[doc.id]
                                                                                        ? {
                                                                                            nama_file:
                                                                                                doc.master_document?.nama_dokumen || doc.nama_file,
                                                                                            path: tempFiles[doc.id],
                                                                                        }
                                                                                        : undefined
                                                                                }
                                                                                uploadConfig={{
                                                                                    url: '/shipping/upload-temp',
                                                                                    payload: {
                                                                                        type: doc.master_document?.nama_dokumen || doc.nama_file,
                                                                                        spk_code: shipmentData.spkNumber,
                                                                                    },
                                                                                }}
                                                                                onFileChange={(file, response) => {
                                                                                    if (
                                                                                        response &&
                                                                                        (response.status === 'success' || response.path)
                                                                                    ) {
                                                                                        setTempFiles((prev) => ({
                                                                                            ...prev,
                                                                                            [doc.id]: response.path,
                                                                                        }));
                                                                                    } else if (file === null) {
                                                                                        setTempFiles((prev) => {
                                                                                            const newState = { ...prev };
                                                                                            delete newState[doc.id];
                                                                                            return newState;
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                disabled={verifyingDocId === doc.id}
                                                                            />
                                                                        ) : (
                                                                            <div className="text-right text-xs text-gray-400 italic">
                                                                                {isPending
                                                                                    ? trans.on_checking || 'On Checking'
                                                                                    : trans.quota_exceeded || 'Quota Exceeded'}
                                                                            </div>
                                                                        )}

                                                                        {/* Quota & Rejection Info (Moved Here) */}
                                                                        {doc.url_path_file && (
                                                                            <div className="flex flex-col items-end text-right text-xs">
                                                                                {/* Rejection Note */}
                                                                                {isRejected && (
                                                                                    <div className="mb-1">
                                                                                        <div className="flex items-center justify-end gap-1 font-bold text-red-600">
                                                                                            {trans.rejection_note || 'Rejection Note'}{' '}
                                                                                            <AlertTriangle className="h-3 w-3" />
                                                                                        </div>
                                                                                        <p className="text-gray-700 italic">
                                                                                            "{doc.correction_description}"
                                                                                        </p>
                                                                                        {doc.correction_attachment_file && (
                                                                                            <a
                                                                                                href={`/file/view/${doc.correction_attachment_file}`}
                                                                                                target="_blank"
                                                                                                className="mt-0.5 block text-blue-500 underline"
                                                                                            >
                                                                                                {trans.view_rejection_file || 'View Rejection File'}
                                                                                            </a>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {/* Quota Info */}
                                                                                <div className="mt-1 text-gray-600">
                                                                                    {trans.revision_quota || 'Revision Quota'}:{' '}
                                                                                    <span className="font-bold">{doc.kuota_revisi ?? 0}</span>{' '}
                                                                                    {trans.remaining || 'remaining'}
                                                                                </div>
                                                                                {quotaExceeded && (
                                                                                    <div className="mt-0.5 font-bold text-red-600">
                                                                                        {trans.quota_exceeded || 'Quota Exceeded'}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="py-4 text-center text-xs text-gray-400 italic">{trans.section_empty}</div>
                                            )}
                                        </div>

                                        <div className="mt-8 flex items-center justify-between">
                                            <button
                                                onClick={handleOpenModal}
                                                className="flex items-center gap-2 text-sm font-bold text-gray-800 hover:text-black"
                                            >
                                                <div className="rounded border border-black p-0.5">
                                                    <Plus className="h-4 w-4" />
                                                </div>
                                                {trans.add_document}
                                            </button>

                                            <Button
                                                onClick={() => handleSaveSection(section.id)}
                                                disabled={processingSectionId === section.id}
                                                className="h-8 rounded bg-black px-8 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                                            >
                                                {processingSectionId === section.id ? trans.saving || 'Saving...' : trans.save_changes}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="py-4 text-center text-gray-500">
                        <p>{trans.loading_docs}</p>
                        <p className="text-xs text-gray-400">{trans.ensure_spk}</p>
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
                <label htmlFor="req_additional" className="cursor-pointer text-sm leading-none font-bold uppercase">
                    {trans.req_additional_doc}
                </label>
            </div>
            {isAdditionalSectionVisible && (
                <div className="mb-8 rounded-lg border border-gray-200 px-1 shadow-sm">
                    {/* Menggunakan AccordionItem manual style agar sesuai gambar */}
                    <div
                        className="flex w-full cursor-pointer items-center justify-between px-3 py-3"
                        onClick={() => setIsAdditionalDocsOpen(!isAdditionalDocsOpen)}
                    >
                        <span className="text-sm font-bold uppercase">{trans.additional_document || 'ADDITIONAL DOCUMENT'}</span>

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
                                <label className="text-sm font-bold text-black">{trans.set_deadline || 'Set Deadline Date'}</label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        className="h-10 w-full border-gray-200 bg-white pr-10 text-gray-500"
                                        placeholder="Pick date"
                                        value={deadlineDate}
                                        onChange={(e) => setDeadlineDate(e.target.value)}
                                    />
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
                                            {trans.upload_here || 'Upload here..'}
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
                                    {trans.add_another_doc || 'Add Another Document'}
                                </button>
                                <Button className="h-9 w-24 rounded bg-black text-xs font-bold text-white hover:bg-gray-800">{trans.save}</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* <div className="mt-12 flex justify-end">
                <Button onClick={handleFinalSave} className="h-10 rounded-md bg-black px-8 text-sm font-bold text-white hover:bg-gray-800">
                    {trans.save_changes}
                </Button>
            </div> */}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-85 rounded-xl p-0 sm:max-w-100">
                    {/* Header Modal */}
                    <DialogHeader className="px-4 py-3">
                        <DialogTitle className="text-left text-lg font-bold">{trans.additional_doc}</DialogTitle>
                    </DialogHeader>

                    {/* Search Bar */}
                    <div className="px-4 pb-2">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder={trans.search_keyword}
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
                        <button className="text-sm text-gray-500 hover:text-black hover:underline">{trans.see_all}</button>
                        <Button
                            className="h-10 w-full rounded-md bg-black text-sm font-bold text-white hover:bg-gray-800"
                            onClick={() => setIsModalOpen(false)}
                        >
                            {trans.save_changes}
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
                                    {trans.download_example} {selectedHelpData.nama_file}
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
                                    {trans.download_template} {selectedHelpData.nama_file}
                                </Button>
                            </a>
                        </div>
                    )}

                    {/* Video Section */}
                    {videoUrl && videoId && (
                        <div>
                            <h3 className="mb-2 text-sm font-bold text-black">{trans.video_tutorial}</h3>
                            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-black">
                                {isVideoPlaying ? (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        className="absolute inset-0 h-full w-full"
                                    ></iframe>
                                ) : (
                                    <button
                                        onClick={() => setIsVideoPlaying(true)}
                                        className="group relative flex h-full w-full items-center justify-center"
                                    >
                                        {thumbnailUrl && (
                                            <img
                                                src={thumbnailUrl}
                                                alt="Video thumbnail"
                                                className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                                            />
                                        )}
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

            <Dialog open={rejectionModalOpen} onOpenChange={setRejectionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{trans.reject_document || 'Reject Document'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{trans.rejection_reason || 'Reason for Rejection'}</Label>
                            <Textarea
                                value={rejectionNote}
                                onChange={(e) => setRejectionNote(e.target.value)}
                                placeholder={trans.placeholder_rejection || 'Enter reason for rejection...'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{trans.correction_file || 'Correction File (Optional)'}</Label>
                            <Input type="file" onChange={(e) => setRejectionFile(e.target.files ? e.target.files[0] : null)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectionModalOpen(false)}>
                            {trans.cancel}
                        </Button>
                        <Button style={{ color: 'white' }} variant="destructive" onClick={handleSubmitReject} disabled={verifyingDocId !== null}>
                            {verifyingDocId ? trans.rejecting || 'Rejecting...' : trans.confirm_rejection || 'Confirm Rejection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {trans.history || 'History'}: {selectedHistoryTitle}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
                        {selectedHistoryDocs.map((doc, idx) => {
                            const isVerified = doc.verify === true;
                            const isRejected = doc.verify === false;

                            return (
                                <div key={doc.id} className="flex flex-col gap-1 border-b pb-2 last:border-0">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-gray-700">
                                            {trans.version || 'Version'} {selectedHistoryDocs.length - idx}
                                        </span>{' '}
                                        <span className="text-xs text-gray-500">{doc.created_at || 'Unknown Date'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <a
                                            href={`/file/view/${doc.url_path_file}`}
                                            target="_blank"
                                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                        >
                                            <FileText className="h-3 w-3" /> {doc.nama_file}
                                        </a>
                                        {isVerified && <span className="rounded bg-green-100 px-1 text-[10px] text-green-700">{trans.verified}</span>}
                                        {isRejected && <span className="rounded bg-red-100 px-1 text-[10px] text-red-700">{trans.rejected}</span>}
                                    </div>
                                    {isRejected && (
                                        <div className="text-xs text-red-600 italic">
                                            {trans.note || 'Note'}: "{doc.correction_description}"
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
                            {trans.close || 'Close'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
