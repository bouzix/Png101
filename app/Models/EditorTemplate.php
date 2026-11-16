<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class EditorTemplate extends Model
{
    use UsesUuid;

    protected $table = 'EditorTemplate';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'id',
        'title',
        'slug',
        'description',
        'categoryId',
        'width',
        'height',
        'presetLabel',
        'pagesJson',
        'thumbnailPath',
        'tags',
        'isFeatured',
        'status',
        'usageCount',
        'createdBy',
    ];

    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
        'pagesJson' => 'array',
        'tags' => 'array',
        'isFeatured' => 'boolean',
        'usageCount' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(EditorTemplateCategory::class, 'categoryId', 'id');
    }
}
