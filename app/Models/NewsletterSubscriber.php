<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterSubscriber extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['unsubscribe_token'];

    protected function casts(): array
    {
        return [
            'consented_at' => 'datetime',
            'unsubscribed_at' => 'datetime',
        ];
    }
}
