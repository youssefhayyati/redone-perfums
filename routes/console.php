<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('app:prune-carts')->daily();
Schedule::command('auth:clear-resets')->daily();
