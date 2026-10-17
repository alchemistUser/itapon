# iTapon Database (Supabase)

Roadmap Phase 10. Postgres 17 on Supabase, with **Row Level Security on every table**.

| Environment | Project | Ref | Region |
|---|---|---|---|
| dev | `itapon-dev` | `svvbvkdkgduyphkkaiio` | ap-northeast-1 (Tokyo) |
| prod | `itapon-prod` | not created yet (Phase 24; prefer Singapore) | |

## Entity-relationship diagram

```mermaid
erDiagram
  waste_categories ||--o{ waste_items : "category_key"
  waste_items ||--o{ scan_detections : "class_key"
  waste_categories ||--o{ scan_detections : "category_key (set by trigger)"
  auth_users ||--|| profiles : "id"
  institutions ||--o{ profiles : "institution_id"
  institutions ||--o{ devices : "institution_id"
  auth_users ||--o| devices : "kiosk_user_id"
  auth_users ||--o{ scan_sessions : "user_id"
  devices ||--o{ scan_sessions : "device_id (set by trigger)"
  institutions ||--o{ scan_sessions : "institution_id (set by trigger)"
  scan_sessions ||--o{ scan_detections : "session_id"
  scan_detections ||--o{ feedback : "detection_id"
  auth_users ||--o{ feedback : "user_id"

  waste_categories {
    text key PK "biodegradable|recyclable|residual|hazardous"
    text name
    text bin_label
    text bin_color
    smallint sort_order
  }
  waste_items {
    uuid id PK
    text class_key UK "matches the model's class_key"
    text display_name
    text category_key FK
    text short_instruction
    text reuse_tip
    jsonb prep_steps
    text why_text
    text contamination_note
    text_array search_aliases
    bool is_detectable
  }
  profiles {
    uuid id PK "= auth.users.id"
    app_role role "user|admin|kiosk"
    uuid institution_id FK
    jsonb prefs
  }
  scan_sessions {
    uuid id PK
    uuid user_id FK
    uuid device_id FK
    uuid institution_id FK
    text model_version
    scan_source source
    int latency_ms
    text inference_backend
  }
  scan_detections {
    uuid id PK
    uuid session_id FK
    text class_key FK
    text category_key FK
    real confidence
    jsonb bbox
    bool is_primary
  }
  feedback {
    uuid id PK
    uuid user_id FK
    uuid detection_id FK
    bool is_correct
    text corrected_class_key FK
    text image_path "only with consent"
    bool consent
    text review_status "pending|approved|rejected"
    text reviewed_class_key FK
  }
```

**Differences from the roadmap sketch:** categories use their text `key` as the primary key (`category_key` instead of `category_id`). That's stable across environments and readable in queries. `scan_sessions.user_id` is **always set**, because every visitor is a signed-in user: anonymous guests (D3), registered users or kiosk accounts.

## Who can do what (RLS)

| Table | Not signed in | Signed-in user (incl. anonymous guest) | Admin (same institution) |
|---|---|---|---|
| `waste_categories`, `waste_items` | read | read | read + write |
| `profiles` | none | read own; update **only** `display_name`, `prefs` | read institution profiles |
| `institutions` | none | read own | read own |
| `devices` | none | kiosk reads own device | manage institution devices |
| `scan_sessions`, `scan_detections` | none | insert / read / delete **own**; no updates | read institution scans |
| `feedback` | none | insert (own detections, pending only) / read / delete own; no updates | read own institution's; review via `admin_review_feedback` |
| storage `training-images` | none | upload/read/delete under `<user_id>/…` | read photos of own institution's feedback |

Server-side rules that clients can't bypass:
- **Bins come from the database.** A trigger sets `scan_detections.category_key` from `waste_items`, whatever the client sends. An unknown `class_key` is rejected.
- **Kiosk context.** A trigger fills `device_id`, `institution_id` and `source = 'kiosk'` only for real kiosk accounts. Other users can't claim to be a kiosk.
- **No self-promotion.** Clients can't update `role` or `institution_id` (column privileges).
- **Profiles** are created automatically for every new auth user (trigger on `auth.users`).

RPCs (security invoker, so RLS applies): `daily_counts_by_category(p_from, p_to)`, `top_items(p_from, p_to, p_limit)`, `delete_my_data()`. Days are grouped in Asia/Manila time.

## Content (Bin Guide + bin mapping)

- **Edit** `supabase/content/waste_content.json`: 4 bins and 36 items (23 the model detects + 13 Bin-Guide-only), with Filipino names and aliases.
- **Regenerate** the seed: `pnpm db:seed:build` (runs `supabase/scripts/build_seed.py`; CI fails if `seed.sql` is stale).
- `services/ml-api/tests/test_content.py` checks that the 23 detectable items match the model's classes and bins exactly.

## Commands

```bash
pnpm exec supabase login                          # once per machine
pnpm exec supabase link --project-ref svvbvkdkgduyphkkaiio
pnpm db:push                                      # apply new migrations + seed (upserts)
pnpm --filter web db:types                        # regenerate apps/web/src/lib/database.types.ts
SUPABASE_URL=https://svvbvkdkgduyphkkaiio.supabase.co SUPABASE_ANON_KEY=<anon key> pnpm db:rls-check
```

New schema changes always go in a **new** migration file (`supabase migration new <name>`). Never edit an applied one.

## Verification (2026-10-17, itapon-dev)

- `supabase db push`: 4 migrations + seed applied with no errors.
- `supabase db lint`: no schema errors.
- `supabase/tests/rls-check.mjs`: **32/32 checks passed** (2026-10-17). Public read-only content; two anonymous users can't see, add to or delete each other's scans; server-side bin; no self-promotion to admin; prefs editable; RPCs scoped by RLS; `delete_my_data` works; feedback only on your own detections, never pre-approved, photo needs consent, no review by non-admins, no uploads into another user's folder (Phase 20).
