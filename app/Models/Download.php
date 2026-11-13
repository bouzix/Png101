<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class Download extends Model
{
    use UsesUuid;

    protected $table = 'Download';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = null;

    protected $fillable = [
        'id', 'imageId', 'deviceType', 'country', 'countryName', 'isCustomSize', 'resolution',
    ];

    protected $casts = [
        'isCustomSize' => 'boolean',
    ];

    public function image()
    {
        return $this->belongsTo(Image::class, 'imageId', 'id');
    }
}

