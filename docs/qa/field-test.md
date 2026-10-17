# Field test protocol (Phase 23, task 7)

Goal: the **real-world bin accuracy** of the shipped model (D11/D12) on real items under real
campus lighting. It reuses the app's own feedback loop (Phase 20), so no extra tools are needed.

## Setup (once)

1. Create a field-test institution and make the test lead its admin (SQL in
   [kiosk-setup.md](../kiosk-setup.md#making-the-first-admin-project-team-once-per-institution)),
   e.g. `Field test 2026-11 (TIP QC)`.
2. Each tester signs in on their phone (Account → Sign in) and the lead adds them to the
   institution:
   ```sql
   update public.profiles set institution_id = '<field-test institution id>'
    where id = (select id from auth.users where email = 'tester@example.com');
   ```
   Their scans are then tagged with the institution, and their answers show up in the
   lead's `/admin` review queue.

## Session

- **Items:** at least 100 scans across all 23 classes, plus 10 non-waste items (phone, keys,
  mug). Use real campus trash: canteen, library, hallway bins.
- **Conditions:** at least three lighting conditions (bright daylight, indoor fluorescent,
  dim corridor). Hold the item about 30–50 cm from the camera. One item per scan, the way a
  user would.
- **For every scan:** answer *Was this right?* honestly. Yes if the shown item **and bin** are
  right. Otherwise No, then choose the true item ("Something else, or not trash" for
  non-waste). Tick photo sharing only for photos without faces, IDs or screens.
- Note lighting and location per batch (time ranges) in the table below.

## Results (SQL, run as the project team)

Bin accuracy compares the bin shown with the true item's bin. A "Yes" answer counts as
correct by definition.

```sql
with f as (
  select f.is_correct, d.category_key as shown_bin,
         coalesce(t.category_key, case when f.is_correct then d.category_key end) as true_bin,
         f.model_version, s.created_at
  from public.feedback f
  join public.scan_detections d on d.id = f.detection_id
  join public.scan_sessions s on s.id = d.session_id
  left join public.waste_items t on t.class_key = f.corrected_class_key
  where s.institution_id = '<field-test institution id>'
    and s.created_at between '<start>' and '<end>'
)
select model_version,
       count(*)                                                    as answers,
       round(avg((is_correct)::int) * 100, 1)                      as item_accuracy_pct,
       round(avg((shown_bin = true_bin)::int)
             filter (where true_bin is not null) * 100, 1)         as bin_accuracy_pct,
       count(*) filter (where true_bin is null and not is_correct) as non_waste_or_unknown
from f group by model_version;
```

Per bin (where the errors are):

```sql
-- same CTE as above, then:
select true_bin, count(*) n, round(avg((shown_bin = true_bin)::int) * 100, 1) bin_acc_pct
from f where true_bin is not null group by true_bin order by true_bin;
```

## Record

| Session | Date / time | Location & lighting | Testers | Scans | Item acc. | Bin acc. | Notes |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |

Export the approved shared photos afterwards (`scripts/export_feedback.py`) to grow the
regression set and the next model's field set ([retraining.md](../retraining.md)).
