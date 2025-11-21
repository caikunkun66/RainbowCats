<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo($request)
    {
        // For API requests, return null to get JSON 401 response
        if ($request->is('api/*') || $request->expectsJson()) {
            return null;
        }
        
        // For web requests, you can define a login route if needed
        // For now, return null to avoid route not found errors
        return null;
    }
}
