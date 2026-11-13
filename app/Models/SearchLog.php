<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class SearchLog extends Model
{
    use UsesUuid;

    protected $table = 'SearchLog';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = null;

    protected $fillable = ['id', 'query', 'resultsCount'];

    protected $casts = [
        'resultsCount' => 'integer',
    ];
}

