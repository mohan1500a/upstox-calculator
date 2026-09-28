/**
 * Compounding Velocity Engine: Pure Analytical Discrete Solver
 * Enforces natural whole-number trades and strict ceiling math for trading days.
 */

export function computeCompoundingVelocity(params) {
    let cInit = Math.max(0.01, params.initialCap);
    let cFinal = Math.max(0.01, params.finalCap);

    // Enforce condition: Target Capital cannot be less than Initial Capital
    if (cFinal < cInit) {
        cFinal = cInit;
    }

    const rPct = Math.max(0.0, params.returnPct);
    const dPct = Math.max(0.0, Math.min(100.0, params.deployPct));
    const daysYear = Math.max(1, params.tradingDaysPerYear);
    const yrs = Math.max(0.01, params.years);

    const effectiveRate = (dPct / 100.0) * (rPct / 100.0);

    let exactTrades = 0.0;
    let isGoalValid = true;

    if (cFinal <= cInit) {
        isGoalValid = true;
        exactTrades = 0.0;
    } else if (effectiveRate <= 0) {
        isGoalValid = false;
        exactTrades = 0.0;
    } else {
        exactTrades = Math.log(cFinal / cInit) / Math.log(1.0 + effectiveRate);
    }

    const totalTrades = Math.ceil(exactTrades);
    const totalDays = daysYear * yrs;

    // Natural Number Discrete Velocity Architecture:
    // Whole trades/day: ceil(totalTrades / totalDays).
    // Exact trading days required: ceil(totalTrades / dailyTrades).
    const dailyTrades = (isGoalValid && totalDays > 0 && totalTrades > 0)
        ? Math.max(1, Math.ceil(totalTrades / totalDays))
        : 0;
    const daysNeeded = (dailyTrades > 0) ? Math.ceil(totalTrades / dailyTrades) : 0;

    const totalMonths = yrs * 12.0;
    const monthlyTrades = (isGoalValid && totalMonths > 0 && totalTrades > 0)
        ? Math.max(1, Math.ceil(totalTrades / totalMonths))
        : 0;
    const monthsNeeded = (monthlyTrades > 0) ? Math.ceil(totalTrades / monthlyTrades) : 0;

    const netProfit = Math.max(0.0, cFinal - cInit);
    const multiplier = cInit > 0 ? cFinal / cInit : 1.0;

    // Generate Sensitivity Matrix for 10%, 25%, 50%, 75%, 100% capital deployed
    const sensitivities = [];
    const deploySteps = [10, 25, 50, 75, 100];

    deploySteps.forEach(deployVal => {
        const effRate = (deployVal / 100.0) * (rPct / 100.0);
        let trades = 0;
        let dTrades = 0;
        let dDays = 0;
        if (isGoalValid && effRate > 0 && cFinal > cInit) {
            const exact = Math.log(cFinal / cInit) / Math.log(1.0 + effRate);
            trades = Math.ceil(exact);
            dTrades = totalDays > 0 ? Math.max(1, Math.ceil(trades / totalDays)) : 0;
            dDays = dTrades > 0 ? Math.ceil(trades / dTrades) : 0;
        }
        sensitivities.push({
            deployPct: deployVal,
            tradesNeeded: trades,
            dailyTrades: dTrades,
            daysNeeded: dDays,
            isSelected: Math.abs(deployVal - dPct) < 0.1
        });
    });

    return {
        cInit,
        cFinal,
        daysYear,
        yrs,
        effectiveRate,
        totalTrades,
        totalDays,
        dailyTrades,
        daysNeeded,
        monthlyTrades,
        monthsNeeded,
        netProfit,
        multiplier,
        sensitivities,
        isGoalValid
    };
}
