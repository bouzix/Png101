<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class ImageView extends Model
{
    use UsesUuid;

    protected $table = 'ImageView';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = null;

    protected $fillable = ['id', 'imageId'];

    public function image()
    {
        return $this->belongsTo(Image::class, 'imageId', 'id');
    }
}

