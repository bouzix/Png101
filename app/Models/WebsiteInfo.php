<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebsiteInfo extends Model
{
    protected $table = 'WebsiteInfo';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = null;
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'id', 'websiteName', 'websiteUrl', 'tagline', 'contactEmail',
        'dmcaEmail', 'companyName', 'country', 'address', 'foundedYear',
    ];
}

