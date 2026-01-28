<!DOCTYPE html>
<html>
<head>
    <title>Dokumen Baru Diupload</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #000;">Dokumen Baru Telah Diupload</h2>
        
        <p>Halo <strong>{{ $recipient->name }}</strong>,</p>
        
        <p>
            Terdapat aktivitas upload dokumen baru pada SPK <strong>{{ $spk->spk_code }}</strong>.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Uploaded By:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{{ $uploader->name }} ({{ ucfirst($uploader->role) }})</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Section:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{{ $sectionName }}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Waktu:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{{ now()->format('d M Y H:i') }}</td>
            </tr>
        </table>

        <p>Silakan login ke aplikasi untuk melihat dan memverifikasi dokumen tersebut.</p>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="{{ url('/shipping/' . $spk->id) }}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Lihat Dokumen
            </a>
        </div>

        <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #777;">Email ini dikirim secara otomatis oleh sistem.</p>
    </div>
</body>
</html>
