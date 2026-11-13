<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class Image extends Model
{
    use UsesUuid;

    protected $table = 'Image';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    use \Illuminate\Database\Eloquent\SoftDeletes;

    const DELETED_AT = 'deletedAt';

    protected $fillable = [
        'id', 'filename', 'path', 'previewPath', 'thumbPath', 'name', 'description',
        'altText', 'tags', 'status', 'width', 'height', 'size', 'mimeType',
        'luminance', 'contrastBgDark', 'contrastBgLight', 'deletedAt',
    ];

    protected $casts = [
        'tags' => 'array',
        'width' => 'integer',
        'height' => 'integer',
        'size' => 'integer',
    ];

    public function categories()
    {
        return $this->hasMany(ImageCategory::class, 'imageId', 'id');
    }

    public function collections()
    {
        return $this->hasMany(CollectionImage::class, 'imageId', 'id');
    }

    public function downloads()
    {
        return $this->hasMany(Download::class, 'imageId', 'id');
    }

    public function views()
    {
        return $this->hasMany(ImageView::class, 'imageId', 'id');
    }
}

