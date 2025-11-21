<?php

namespace App\Services;

use App\Models\CreditTransaction;
use App\Models\Mission;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class MissionService
{
    public function createMission(User $owner, array $data): Mission
    {
        return $owner->missions()->create($data);
    }

    public function updateMission(Mission $mission, array $data): Mission
    {
        $mission->update($data);
        return $mission->fresh('owner');
    }

    public function completeMission(User $actor, Mission $mission): void
    {
        DB::transaction(function () use ($actor, $mission) {
            if ($mission->status === 'finished') {
                return;
            }

            $mission->update(['status' => 'finished']);

            $mission->owner()->lockForUpdate()->first();
            $mission->owner->increment('credit', $mission->reward_credit);

            CreditTransaction::create([
                'user_id' => $mission->owner_id,
                'delta' => $mission->reward_credit,
                'source_type' => Mission::class,
                'source_id' => $mission->id,
                'meta' => [
                    'completed_by' => $actor->id,
                ],
            ]);
        });
    }
}



