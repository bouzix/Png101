<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class ImageCategory extends Model
{
    use UsesUuid;

    protected $table = 'ImageCategory';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = null;

    protected $fillable = ['id', 'imageId', 'categoryId'];

    public function image()
    {
        return $this->belongsTo(Image::class, 'imageId', 'id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'categoryId', 'id');
    }
}

