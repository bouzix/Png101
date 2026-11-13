<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class TeamMember extends Model
{
    use UsesUuid;

    protected $table = 'TeamMember';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'id', 'name', 'email', 'passwordHash', 'permissions', 'isActive', 'lastLoginAt',
    ];

    protected $casts = [
        'permissions' => 'array',
        'isActive' => 'boolean',
        'lastLoginAt' => 'datetime',
    ];
}

