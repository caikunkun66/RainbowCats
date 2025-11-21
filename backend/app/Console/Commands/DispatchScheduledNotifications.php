<?php

namespace App\Console\Commands;

use App\Services\NotificationService;
use Illuminate\Console\Command;

class DispatchScheduledNotifications extends Command
{
    protected $signature = 'notifications:dispatch-due';

    protected $description = 'Send pending subscribe notifications whose schedule time has arrived.';

    public function __construct()
    {
        parent::__construct();
    }

    public function handle(NotificationService $notificationService): int
    {
        $count = $notificationService->dispatchDueNotifications();
        $this->info("Dispatched {$count} notifications.");
        return Command::SUCCESS;
    }
}


