<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CodeInjection extends Model
{
    protected $table = 'CodeInjection';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = null;
    const UPDATED_AT = 'updatedAt';

    protected $fillable = ['id', 'headCode', 'bodyCode', 'footerCode'];
}

