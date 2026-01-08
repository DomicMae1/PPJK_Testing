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
}
