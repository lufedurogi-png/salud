<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserLoginLog;
use App\Services\WeeklyClientRankingService;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    public function __construct(private WeeklyClientRankingService $weeklyRanking) {}
    private function monthExpr(string $column): string
    {
        $driver = DB::connection()->getDriverName();

        return match ($driver) {
            'sqlsrv' => "FORMAT($column, 'yyyy-MM')",
            'sqlite' => "strftime('%Y-%m', $column)",
            'pgsql' => "to_char($column, 'YYYY-MM')",
            default => "DATE_FORMAT($column, '%Y-%m')", // mysql / mariadb
        };
    }

    public function actividadUsuarios()
    {
        $dateExprUsers = $this->monthExpr('created_at');
        $dateExprLog = $this->monthExpr('logged_at');

        $registros = User::select(
            DB::raw("$dateExprUsers as mes"),
            DB::raw('COUNT(*) as registros')
        )->groupBy(DB::raw($dateExprUsers))->get()->keyBy('mes');

        $logins = UserLoginLog::select(
            DB::raw("$dateExprLog as mes"),
            DB::raw('COUNT(*) as logins')
        )->groupBy(DB::raw($dateExprLog))->get()->keyBy('mes');

        $meses = collect($registros->keys())->merge($logins->keys())->unique()->sort()->values();
        $data = $meses->map(fn ($mes) => [
            'mes' => $mes,
            'registros' => (int) ($registros[$mes]->registros ?? 0),
            'logins' => (int) ($logins[$mes]->logins ?? 0),
        ])->all();

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function ranking()
    {
        $ranking = $this->weeklyRanking->ranking();
        $trends = $this->weeklyRanking->rankingTrends($ranking);

        return response()->json([
            'success' => true,
            'data' => $ranking,
            'ranking_trends' => $trends,
        ]);
    }
}
