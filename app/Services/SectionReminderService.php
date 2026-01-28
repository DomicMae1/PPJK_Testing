<?php

namespace App\Services;

use App\Models\User;
use App\Models\Spk;
use Illuminate\Support\Facades\Mail;

class SectionReminderService
{
    /**
     * Kirim notifikasi email section reminder ke staff internal.
     *
     * @param string $section
     * @param User $staff
     * @param User $externalUser
     * @param Spk $spk
     * @return void
     * @throws \Exception
     */
    public static function send($section, User $staff, User $externalUser, Spk $spk)
    {
        if (!$staff || empty($staff->email)) {
            throw new \Exception('Staff atau email staff tidak ditemukan');
        }
        Mail::to($staff->email)->send(new \App\Mail\SectionReminderMail($section, $externalUser, $spk));
    }

    /**
     * Kirim email notifikasi SPK Baru ke staff internal.
     * 
     * @param User $staff
     * @param Spk $spk
     * @param User $creator
     * @return void
     */
    public static function sendSpkCreated(User $staff, Spk $spk, User $creator)
    {
         if (!$staff || empty($staff->email)) {
            // Log warning logic here if needed, but for now just return or throw
            return; 
        }
        Mail::to($staff->email)->send(new \App\Mail\SpkCreatedMail($spk, $creator));
    }

    /**
     * Kirim email saat dokumen diupload (Batch).
     *
     * @param Spk $spk
     * @param string $sectionName
     * @param User $uploader
     * @param User $recipient
     * @return void
     */
    public static function sendDocumentUploaded(Spk $spk, $sectionName, User $uploader, User $recipient)
    {
        if (!$recipient || empty($recipient->email)) return;

        try {
            \Illuminate\Support\Facades\Mail::to($recipient->email)->queue(new \App\Mail\DocumentUploadedMail($spk, $sectionName, $uploader, $recipient));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to queue DocumentUploadedMail: " . $e->getMessage());
        }
    }

    /**
     * Kirim email saat dokumen diverifikasi (Batch).
     */
    public static function sendDocumentVerified(Spk $spk, $sectionName, User $verifier, User $recipient)
    {
        if (!$recipient || empty($recipient->email)) return;

        try {
            \Illuminate\Support\Facades\Mail::to($recipient->email)->queue(new \App\Mail\DocumentVerifiedMail($spk, $sectionName, $verifier, $recipient));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to queue DocumentVerifiedMail: " . $e->getMessage());
        }
    }

    /**
     * Kirim email saat dokumen ditolak (Rejection).
     */
    public static function sendDocumentRejected(Spk $spk, $sectionName, User $rejector, User $recipient, $reason, $documentName)
    {
        if (!$recipient || empty($recipient->email)) return;

        try {
            \Illuminate\Support\Facades\Mail::to($recipient->email)->queue(new \App\Mail\DocumentRejectedMail($spk, $sectionName, $rejector, $recipient, $reason, $documentName));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to queue DocumentRejectedMail: " . $e->getMessage());
        }
    }
}
