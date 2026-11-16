<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class EditorUsageLog extends Model
{
    use UsesUuid;

    protected $table = 'EditorUsageLog';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'eventType',
        'templateId',
        'imageId',
        'searchQuery',
        'resultCount',
        'format',
        'width',
        'height',
        'pageCount',
        'deviceType',
        'ipAddress',
        'createdAt',
    ];

    protected $casts = [
        'resultCount' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'pageCount' => 'integer',
        'createdAt' => 'datetime',
    ];
}
