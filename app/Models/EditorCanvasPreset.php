<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class EditorCanvasPreset extends Model
{
    use UsesUuid;

    protected $table = 'EditorCanvasPreset';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'id',
        'name',
        'groupName',
        'width',
        'height',
        'icon',
        'sortOrder',
        'isActive',
    ];

    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
        'sortOrder' => 'integer',
        'isActive' => 'boolean',
    ];
}
