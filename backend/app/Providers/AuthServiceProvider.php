<?php

namespace App\Providers;

use App\Models\Item;
use App\Models\Mission;
use App\Models\Order;
use App\Policies\ItemPolicy;
use App\Policies\MissionPolicy;
use App\Policies\OrderPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array
     */
    protected $policies = [
        Mission::class => MissionPolicy::class,
        Item::class => ItemPolicy::class,
        Order::class => OrderPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     *
     * @return void
     */
    public function boot()
    {
        $this->registerPolicies();
    }
}
