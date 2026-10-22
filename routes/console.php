<?php

use App\Console\Commands\LaunchCheck;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Schedule::command('app:prune-carts')->daily();
Schedule::command('auth:clear-resets')->daily();

// Proof that the server's cron runs the scheduler (see app:launch-check).
Schedule::call(fn () => Cache::put(LaunchCheck::HEARTBEAT, now()->getTimestamp()))->everyMinute()->name('scheduler-heartbeat');
