# supabase/

Database schema, RLS policies and seed data (roadmap Phase 10).

- `migrations/`: SQL migrations, applied to prod only through CI
- `seed.sql`: categories and items generated from `docs/spec.md` §4 (Phase 10)
- `demo/`: a labelled demo institution with synthetic scans for showing `/admin` (dev only), plus its cleanup script (Phase 19)
