<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Review Customer</title>
</head>

<body>
    <h2>Hasil Review</h2>
    <p>Halo,</p>
    <p>Customer {{$nama->nama_personal}} mendapatkan review <span style="color: red;">bermasalah</span> dengan catatan lawyer sebagai berikut:'</p>

    @if ($status->status_3_keterangan)
    <p><strong>Dengan Keterangan:</strong> </p>
    <p>{{ $status->status_3_keterangan }}</p>
    @endif

    <p>Silakan cek kembali hasil review anda.</p>
</body>

</html>