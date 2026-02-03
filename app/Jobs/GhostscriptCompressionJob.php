<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class GhostscriptCompressionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $absPath;
    protected $finalRelPath;

    /**
     * Create a new job instance.
     */
    public function __construct($absPath, $finalRelPath)
    {
        $this->absPath = $absPath;
        $this->finalRelPath = $finalRelPath;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        if (!file_exists($this->absPath)) {
            Log::warning("GS Job: File not found at {$this->absPath}");
            return;
        }

        $fileSize = filesize($this->absPath);
        Log::info("GS Job: Processing {$this->finalRelPath} ($fileSize bytes)");

        $tempGsOutIdx = uniqid('gs_temp_');
        $tempGsOutPath = str_replace('.pdf', "_$tempGsOutIdx.pdf", $this->absPath);

        $success = $this->runGhostscript($this->absPath, $tempGsOutPath, 'medium');

        if ($success && file_exists($tempGsOutPath) && filesize($tempGsOutPath) > 0) {
            $newSize = filesize($tempGsOutPath);
            if ($newSize < $fileSize) {
                // Replace original with compressed only if it's actually smaller
                @unlink($this->absPath);
                rename($tempGsOutPath, $this->absPath);
                Log::info("GS Job: Successfully compressed {$this->finalRelPath} (Reduced from $fileSize to $newSize bytes)");
            } else {
                // Keep original if compressed version is larger
                @unlink($tempGsOutPath);
                Log::info("GS Job: Compressed file was larger ($newSize) than original ($fileSize). Keeping original for {$this->finalRelPath}");
            }
        } else {
            if (file_exists($tempGsOutPath)) @unlink($tempGsOutPath);
            Log::warning("GS Job: Compression failed or produced empty file for {$this->finalRelPath}");
        }
    }

    /**
     * Helper Ghostscript (Copied from Controller or moved to Service)
     */
    private function runGhostscript($inputPath, $outputPath, $mode)
    {
        $settings = [
            'small'  => ['-dPDFSETTINGS=/screen', '-dColorImageResolution=150', '-dGrayImageResolution=150', '-dMonoImageResolution=150'],
            'medium' => ['-dPDFSETTINGS=/ebook', '-dColorImageResolution=200', '-dGrayImageResolution=200', '-dMonoImageResolution=200'],
            'high'   => ['-dPDFSETTINGS=/printer', '-dColorImageResolution=300', '-dGrayImageResolution=300', '-dMonoImageResolution=300'],
        ];
        $config = $settings[$mode] ?? $settings['medium'];

        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $gsExe = $isWindows ? 'C:\Program Files\gs\gs10.05.1\bin\gswin64c.exe' : '/usr/bin/gs';

        if ($isWindows && !file_exists($gsExe)) {
            return false;
        }

        $inputPath  = str_replace('\\', '/', $inputPath);
        $outputPath = str_replace('\\', '/', $outputPath);

        $cmd = array_merge(
            [$gsExe],
            [
                '-q',
                '-dNOPAUSE',
                '-dBATCH',
                '-dSAFER',
                '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4'
            ],
            $config,
            [
                '-sOutputFile=' . $outputPath,
                $inputPath
            ]
        );

        try {
            $process = new Process($cmd);
            if ($isWindows) {
                $tempDir = sys_get_temp_dir();
                $process->setEnv([
                    'TEMP' => $tempDir,
                    'TMP'  => $tempDir,
                    'SystemRoot' => getenv('SystemRoot') ?: 'C:\Windows',
                ]);
            }
            $process->setTimeout(300);
            $process->run();

            return $process->isSuccessful();
        } catch (\Exception $e) {
            return false;
        }
    }
}
