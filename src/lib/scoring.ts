// Shared ranking/points logic, used by both the publish-results route (persists ranks)
// and the standings route (computes a live, unpersisted preview for admins before
// results are officially published).

export interface RankableEntry {
    id: string;
    totalScore: number | null | undefined;
    teamId?: string;
    participantTeamId?: string; // for solo entries, the participant's own team (may be absent)
}

export interface RankedResult {
    entryId: string;
    totalScore: number;
    rank: number;
}

// Standard competition ranking ("1224"): entries tied on score share the same rank,
// and the next distinct score jumps to the count of entries ranked above it — e.g.
// four entries scoring [90, 80, 80, 60] rank as [1, 2, 2, 4]. This was the confirmed
// tie-break rule: transparent, no hidden tiebreaker judges/participants can't verify.
// Entries that were never scored (totalScore null/undefined) are excluded — they
// didn't compete for a rank.
export function computeRanks(entries: RankableEntry[]): RankedResult[] {
    const scored = entries.filter((e): e is RankableEntry & { totalScore: number } => e.totalScore != null);
    const sorted = [...scored].sort((a, b) => b.totalScore - a.totalScore);

    const ranked: RankedResult[] = [];
    let rank = 0;
    let prevScore: number | null = null;

    sorted.forEach((entry, index) => {
        if (prevScore === null || entry.totalScore !== prevScore) {
            rank = index + 1;
        }
        ranked.push({ entryId: entry.id, totalScore: entry.totalScore, rank });
        prevScore = entry.totalScore;
    });

    return ranked;
}

// Points awarded for a given rank, per the fest's configured scheme (default
// {1: 10, 2: 7, 3: 5}). Ranks with no configured points score 0, not an error —
// most entries in a program don't place.
export function pointsForRank(rank: number, pointsScheme: Record<string, number>): number {
    return pointsScheme[String(rank)] ?? 0;
}

export interface TeamPointsInput {
    rank: number;
    teamId?: string;
    isTeamProgram: boolean;
}

// Aggregates ranked results into per-team point totals. Team-type programs award
// points directly to the entry's team; solo-type programs award to the participant's
// own team (if they have one — solo entries with no team still rank individually,
// they just don't contribute to team standings).
export function computeTeamPoints(
    results: TeamPointsInput[],
    pointsScheme: Record<string, number>,
    multiplier = 1
): Map<string, number> {
    const totals = new Map<string, number>();

    for (const result of results) {
        if (!result.teamId) continue;
        const base = pointsForRank(result.rank, pointsScheme);
        if (base === 0) continue;
        const awarded = result.isTeamProgram ? base * multiplier : base;
        totals.set(result.teamId, (totals.get(result.teamId) || 0) + awarded);
    }

    return totals;
}
