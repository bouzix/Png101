<?php

namespace App\Console\Commands;

use App\Services\TrashService;
use Illuminate\Console\Command;

class PurgeTrashCommand extends Command
{
    protected $signature = 'images:purge-trash';
    protected $description = 'Permanently remove soft-deleted PNG images whose trash retention period has expired.';

    public function handle(): int
    {
        $days = TrashService::getRetentionDays();
        if ($days <= 0) {
            $this->info('Trash auto-purge is disabled (retention set to Keep Forever).');
            return self::SUCCESS;
        }

        $count = TrashService::purgeExpired();
        $this->info("Purged {$count} expired trashed image(s) older than {$days} day(s).");

        return self::SUCCESS;
    }
}

