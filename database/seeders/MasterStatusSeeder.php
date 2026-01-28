<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MasterStatusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();

        $statuses = [
            [
                'id_status' => 1,
                'priority'     => 'Upload',
                'index'  => 2,
                'created_at'=> $now, 'updated_at'=> $now,
            ],
            [
                'id_status' => 2,
                'priority'     => 'Requested',
                'index'  => 1,
                'created_at'=> $now, 'updated_at'=> $now,
            ],
            [
                'id_status' => 3,
                'priority'     => 'Reuploaded',
                'index'  => 1,
                'created_at'=> $now, 'updated_at'=> $now,
            ],
            [
                'id_status' => 4,
                'priority'     => 'Rejected', // Atau Revision Needed
                'index'  => 0,
                'created_at'=> $now, 'updated_at'=> $now,
            ],
            [
                'id_status' => 5,
                'priority'     => 'Verified',
                'index'  => 2,
                'created_at'=> $now, 'updated_at'=> $now,
            ],
            [
                'id_status' => 6,
                'priority'     => 'Created',
                'index'  => 3,
                'created_at'=> $now, 'updated_at'=> $now,
            ],
            [
                'id_status' => 7,
                'priority'     => 'Completed',
                'index'  => 3,
                'created_at'=> $now, 'updated_at'=> $now,
            ],
        ];

        $table = DB::connection('tako-user')->table('master_statuses');

        try {
            $table->delete(); 
        } catch (\Exception $e) {
        }

        $table->insert($statuses);
    }
}