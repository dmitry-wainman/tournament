# Tournament seeding & scoring

## Stack
Next.js (TypeScript) + PostgreSQL via Prisma. Deploy on Vercel + Neon/Supabase.

## Structure
- `prisma/schema.prisma` — data model (players, tournaments, rounds, groups of 4, matches, results, pairing history)
- `lib/standings.ts` — computes standings: sum(rank) ascending, then sum(points) descending as tiebreaker
- `lib/pairings.ts` — tracks how many times each pair of players has faced each other
- `lib/seeding.ts` — groups players into pods of 4 by current standing, avoiding repeat opponents via backtracking, with a graceful fallback (fewest-prior-meetings) if a fully repeat-free grouping is impossible late in a tournament
- `app/api/tournaments/[id]/generate-round/route.ts` — admin action: seeds and creates the next round's groups
- `app/api/matches/[id]/submit-scores/route.ts` — admin action: enter 4 players' scores for a match, auto-computes rank 1–4
- `app/api/rounds/[id]/finalize/route.ts` — locks a round once all scores are in, records pairing history for next round's seeding

## Setup
```bash
npm install next react react-dom @prisma/client
npm install -D prisma typescript @types/node @types/react

npx prisma init
# set DATABASE_URL in .env to your Postgres connection string (e.g. Neon)

npx prisma migrate dev --name init
npx prisma generate
```

## Flow
1. Admin creates a `Tournament` (status `DRAFT`), registers players.
2. Set status to `ACTIVE`, call `POST /api/tournaments/:id/generate-round` — round 1 groups are seeded (no history yet, so grouping follows initial seed order — sort players randomly or by any pre-tournament rating before round 1).
3. For each group's match, admin calls `POST /api/matches/:matchId/submit-scores` with the 4 players' points.
4. Once every group in the round has scores, call `POST /api/rounds/:roundId/finalize` — this locks the round and records pairings.
5. Repeat steps 2–4 for each subsequent round — seeding now uses updated standings and avoids repeat opponents.
6. After the final round, build a public results page that queries `computeStandings()` and flip `Tournament.status` to `PUBLISHED`.

## Notes / things to decide
- **Odd player counts**: current seeding puts any final group of ≤4 leftover players together as-is. If you never want a group of 3, add a rule to redistribute one player from an earlier group instead.
- **Tiebreak on rank submission**: `submit-scores` currently breaks ties in points by input order — decide your game's real tiebreak rule (e.g. secondary stat) and adjust the sort in that route.
- **Round 1 seeding**: no pairing history exists yet, so decide whether round 1 is random, alphabetical, or based on a pre-tournament rating.
