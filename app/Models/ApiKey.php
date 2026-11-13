<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class ApiKey extends Model
{
    use UsesUuid;

    protected $table = 'ApiKey';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = ['id', 'name', 'key', 'modelVersion', 'isActive'];

    protected $casts = [
        'isActive' => 'boolean',
    ];
}

