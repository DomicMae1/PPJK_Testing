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
}
