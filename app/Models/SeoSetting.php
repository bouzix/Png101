<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoSetting extends Model
{
    protected $table = 'SeoSetting';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = null;
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'id', 'autoRegenerate', 'scheduleFrequency', 'scheduleTime',
        'scheduleDayOfWeek', 'scheduleDayOfMonth', 'disallowAdminInRobots',
        'includeImageXml', 'includeLlmsTxt', 'includeManifest',
        'customRobotsRules', 'lastGeneratedAt', 'lastGeneratedTrigger', 'lastStatsJson',
    ];

    protected $casts = [
        'autoRegenerate' => 'boolean',
        'disallowAdminInRobots' => 'boolean',
        'includeImageXml' => 'boolean',
        'includeLlmsTxt' => 'boolean',
        'includeManifest' => 'boolean',
        'scheduleDayOfWeek' => 'integer',
        'scheduleDayOfMonth' => 'integer',
        'lastGeneratedAt' => 'datetime',
    ];
}

