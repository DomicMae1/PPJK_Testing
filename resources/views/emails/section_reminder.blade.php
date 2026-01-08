<p>Halo,</p>
<p>Section <strong>{{ $section }}</strong> telah disimpan oleh customer: <strong>{{ $externalUser->name }}</strong> ({{ $externalUser->email }})</p>
@if($spk)
<p>Info SPK/Shipment: {{ $spk->spk_code ?? '-' }}</p>
@endif
<p>Segera lakukan pengecekan dokumen pada sistem.</p>
