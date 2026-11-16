<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class Collection extends Model
{
    use UsesUuid;

    protected $table = 'Collection';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'id', 'name', 'slug', 'description', 'coverImageId', 'coverImagePath',
        'heroImagePath', 'heroBgColor', 'heroTextColor',
        'cardBgImagePath', 'cardBgColor', 'cardTextColor',
        'trendingCardImagePath',
        'type', 'tagRules', 'ruleMatchMode', 'isFeatured', 'status',
        'order', 'viewsCount', 'downloadsCount',
    ];

    protected $casts = [
        'tagRules' => 'array',
        'isFeatured' => 'boolean',
        'order' => 'integer',
        'viewsCount' => 'integer',
        'downloadsCount' => 'integer',
    ];

    public function images()
    {
        return $this->hasMany(CollectionImage::class, 'collectionId', 'id');
    }
}

