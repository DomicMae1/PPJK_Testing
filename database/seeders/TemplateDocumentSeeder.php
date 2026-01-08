<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TemplateDocumentSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        $data = [
            [
                'attribute' => 1,
                'nama_file' => 'Bill of Lading',
                'url_path_file' => 'documents/master/bl.pdf',
                'link_path_example_file' => 'documents/examples/bl.pdf',
                'link_path_template_file' => 'documents/templates/bl.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'Bill of Lading (B/L), adalah dokumen resmi yang berfungsi sebagai tanda terima barang, kontrak pengangkutan, dan bukti kepemilikan kargo',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'Invoice',
                'url_path_file' => 'documents/master/invoice.pdf',
                'link_path_example_file' => 'documents/examples/invoice.pdf',
                'link_path_template_file' => 'documents/templates/invoice.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'Invoice shipment adalah dokumen yang berisi rincian pengiriman barang, berfungsi sebagai bukti transaksi, tagihan pembayaran, dan catatan untuk proses bea cukai dan pelacakan.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'Packing List',
                'url_path_file' => 'documents/master/packing_list.pdf',
                'link_path_example_file' => 'documents/examples/packing_list.pdf',
                'link_path_template_file' => 'documents/templates/packing_list.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'Packing list shipment adalah dokumen yang merinci setiap item yang ada di dalam pengiriman, termasuk deskripsi barang, jumlah, berat, dan dimensi setiap kemasan.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'Polis Asuransi',
                'url_path_file' => 'documents/master/polis_asuransi.pdf',
                'link_path_example_file' => 'documents/examples/polis_asuransi.pdf',
                'link_path_template_file' => 'documents/templates/polis_asuransi.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'Polis asuransi shipment adalah dokumen yang berisi jaminan perlindungan finansial terhadap barang yang dikirim melalui jalur darat, laut, atau udara.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'SK Kepabean',
                'url_path_file' => 'documents/master/sk_kepabean.pdf',
                'link_path_example_file' => 'documents/examples/sk_kepabean.pdf',
                'link_path_template_file' => 'documents/templates/sk_kepabean.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'Surat Kuasa Kepabeanan shipment adalah dokumen hukum yang memberikan wewenang kepada pihak ketiga (seperti pialang pabean atau freight forwarder) untuk bertindak atas nama importir/eksportir.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'Document 1',
                'url_path_file' => 'documents/master/dokumen_1.pdf',
                'link_path_example_file' => 'documents/examples/dokumen_1.pdf',
                'link_path_template_file' => 'documents/templates/dokumen_1.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'Dokumen_1 adalah dokumen hukum yang memberikan wewenang kepada pihak ketiga (seperti pialang pabean atau freight forwarder) untuk bertindak atas nama importir/eksportir.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'Document 2',
                'url_path_file' => 'documents/master/dokumen_2.pdf',
                'link_path_example_file' => 'documents/examples/dokumen_2.pdf',
                'link_path_template_file' => 'documents/templates/dokumen_2.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'Dokumen_2 adalah dokumen hukum yang memberikan wewenang kepada pihak ketiga (seperti pialang pabean atau freight forwarder) untuk bertindak atas nama importir/eksportir.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'Draft PIB',
                'url_path_file' => 'documents/master/draft_pib.pdf',
                'link_path_example_file' => 'documents/examples/draft_pib.pdf',
                'link_path_template_file' => 'documents/templates/draft_pib.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'Draft PIB (Pemberitahuan Impor Barang) adalah rancangan atau draf awal dokumen elektronik yang dibuat oleh importir untuk memberitahukan kepada Direktorat Jenderal Bea dan Cukai (DJBC) tentang kegiatan impor barang yang akan atau sudah dilakukannya, berisi rincian barang, nilai pabean, dan perhitungan bea masuk serta pajak terkait (PPN, PPh) agar dapat diproses secara legal di Indonesia.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'PIB Final',
                'url_path_file' => 'documents/master/pib_final.pdf',
                'link_path_example_file' => 'documents/examples/pib_final.pdf',
                'link_path_template_file' => 'documents/templates/pib_final.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'PIB Final (Pemberitahuan Impor Barang Final) adalah jenis dokumen PIB Penyelesaian, yaitu pemberitahuan pabean yang diajukan setelah barang impor dikeluarkan dari kawasan pabean, berfungsi sebagai penyelesaian kewajiban pabean dan pajak (seperti PPN, PPnBM) untuk impor barang yang sebelumnya ditangguhkan pembayarannya dengan jaminan, serta bisa berfungsi setara faktur pajak untuk keperluan PKP.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'Id Billing',
                'url_path_file' => 'documents/master/id_billing.pdf',
                'link_path_example_file' => 'documents/examples/id_billing.pdf',
                'link_path_template_file' => 'documents/templates/id_billing.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'ID Billing atau Kode Billing adalah kode identifikasi unik yang diterbitkan oleh sistem billing pemerintah Indonesia untuk setiap jenis pembayaran atau setoran penerimaan negara (seperti pajak dan Penerimaan Negara Bukan Pajak/PNBP) yang akan dilakukan oleh wajib pajak/wajib bayar/wajib setor.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'attribute' => 1,
                'nama_file' => 'Bukti Pembayaran',
                'url_path_file' => 'documents/master/bukti_pembayaran.pdf',
                'link_path_example_file' => 'documents/examples/bukti_pembayaran.pdf',
                'link_path_template_file' => 'documents/templates/bukti_pembayaran.pdf',
                'link_url_video_file' => 'https://youtu.be/2SDFM0gF1tU?si=ITOYoGrPa85rS0Z3',
                'description_file' => 'Bukti pembayaran pengiriman (shipping) merujuk pada dokumen atau catatan yang menunjukkan bahwa biaya pengiriman paket atau barang telah dibayar.',
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        // Kosongkan tabel terlebih dahulu untuk menghindari duplikasi data saat seeding ulang
        DB::connection('tako-user')->table('master_documents')->truncate();

        // Insert data baru
        DB::connection('tako-user')->table('master_documents')->insert($data);
    }
}