<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MissionRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'reward_credit' => ['required', 'integer', 'min:1', 'max:9999'],
            'due_at' => ['nullable', 'date'],
            'remind_at' => ['nullable', 'date', 'after:now'],
            'star' => ['sometimes', 'boolean'],
            'owner_openid' => ['sometimes', 'string'], // 支持通过 openid 指定 owner
        ];
    }
}



