<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class EditorFont extends Model
{
    use UsesUuid;

    protected $table = 'EditorFont';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'id',
        'family',
        'source',
        'weights',
        'googleImportUrl',
        'filePath',
        'isActive',
        'sortOrder',
    ];

    protected $casts = [
        'weights' => 'array',
        'isActive' => 'boolean',
        'sortOrder' => 'integer',
    ];
}
