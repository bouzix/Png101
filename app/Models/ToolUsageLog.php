<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class ToolUsageLog extends Model
{
    use UsesUuid;

    protected $table = 'ToolUsageLog';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'toolSlug',
        'eventType',
        'filesCount',
        'inputBytes',
        'outputBytes',
        'deviceType',
    ];

    protected $casts = [
        'filesCount' => 'integer',
        'inputBytes' => 'integer',
        'outputBytes' => 'integer',
    ];
}
