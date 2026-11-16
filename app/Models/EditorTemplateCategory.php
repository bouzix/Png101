<?php

namespace App\Models;

use App\Models\Concerns\UsesUuid;
use Illuminate\Database\Eloquent\Model;

class EditorTemplateCategory extends Model
{
    use UsesUuid;

    protected $table = 'EditorTemplateCategory';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'id',
        'name',
        'slug',
        'description',
        'icon',
        'sortOrder',
        'isActive',
    ];

    protected $casts = [
        'sortOrder' => 'integer',
        'isActive' => 'boolean',
    ];

    public function templates()
    {
        return $this->hasMany(EditorTemplate::class, 'categoryId', 'id');
    }
}
