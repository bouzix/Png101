<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class CollectionImage extends Model
{
    use UsesUuid;

    protected $table = 'CollectionImage';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = null;

    protected $fillable = [
        'id', 'collectionId', 'imageId', 'position', 'isPinned', 'isExcluded',
    ];

    protected $casts = [
        'position' => 'integer',
        'isPinned' => 'boolean',
        'isExcluded' => 'boolean',
    ];

    public function collection()
    {
        return $this->belongsTo(Collection::class, 'collectionId', 'id');
    }

    public function image()
    {
        return $this->belongsTo(Image::class, 'imageId', 'id');
    }
}

