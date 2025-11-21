<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MissionLog extends Model
{
    protected $fillable = [
        'mission_id',
        'actor_id',
        'action',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function mission()
    {
        return $this->belongsTo(Mission::class);
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}



