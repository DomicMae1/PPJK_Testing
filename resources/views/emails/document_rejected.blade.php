<!DOCTYPE html>
<html>
<head>
    <title>Dokumen Ditolak (Rejection)</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #d9534f;">Dokumen Perlu Revisi (Rejected)</h2>
        
        <p>Halo <strong>{{ $recipient->name }}</strong>,</p>
        
        <p>
            Dokumen <strong>{{ $documentName }}</strong> pada SPK <strong>{{ $spk->spk_code }}</strong> perlu diperbaiki.
        </p>

        <div style="background-color: #f9f2f4; border-left: 5px solid #d9534f; padding: 15px; margin: 20px 0;">
            <strong>Alasan Penolakan:</strong><br>
            {{ $reason }}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Rejected By:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{{ $rejector->name }} ({{ ucfirst($rejector->role) }})</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Section:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{{ $sectionName }}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Kuota Revisi:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    Mohon cek sisa kuota revisi Anda di aplikasi.
                </td>
            </tr>
        </table>

        <p>Silakan upload ulang dokumen yang telah diperbaiki.</p>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="{{ url('/shipping/' . $spk->id) }}" style="background-color: #d9534f; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Upload Revisi
            </a>
        </div>

        <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #777;">Email ini dikirim secara otomatis oleh sistem.</p>
    </div>
</body>
</html>
