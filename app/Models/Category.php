<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use UsesUuid;

    protected $table = 'Category';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = ['id', 'name', 'slug', 'description', 'parentId'];

    public function parent()
    {
        return $this->belongsTo(Category::class, 'parentId', 'id');
    }

    public function children()
    {
        return $this->hasMany(Category::class, 'parentId', 'id');
    }

    public function images()
    {
        return $this->hasMany(ImageCategory::class, 'categoryId', 'id');
    }
}

