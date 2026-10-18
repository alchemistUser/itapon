# Pilot operational data (Phase 25, task 5)

Most of it is on `/admin` for the pilot institution (pick the pilot dates; **Export CSV** for
raw scans). The queries below produce the numbers for Chapter 4. Run them in the Supabase
SQL editor. Replace `:inst` with the pilot institution id and `:from` / `:to` with the pilot
dates (Philippine time).

## Scans per day and bin distribution

```sql
select (s.created_at at time zone 'Asia/Manila')::date as day,
       count(distinct s.id) as scans,
       count(*) filter (where d.category_key = 'biodegradable') as green,
       count(*) filter (where d.category_key = 'recyclable')    as blue,
       count(*) filter (where d.category_key = 'residual')      as black,
       count(*) filter (where d.category_key = 'hazardous')     as red
from public.scan_sessions s
join public.scan_detections d on d.session_id = s.id and d.is_primary
where s.institution_id = ':inst'
  and (s.created_at at time zone 'Asia/Manila')::date between ':from' and ':to'
group by 1 order by 1;
```

## Speed (Phase 1 target: P95 time to result ≤ 1.5 s on 4G mobile)

Time from the scanner starting to look until the result locks, measured on the device.

```sql
select s.source, s.inference_backend,
       count(*)                                                      as scans,
       percentile_cont(0.50) within group (order by s.latency_ms)    as p50_ms,
       percentile_cont(0.95) within group (order by s.latency_ms)    as p95_ms
from public.scan_sessions s
where s.institution_id = ':inst' and s.latency_ms is not null
  and (s.created_at at time zone 'Asia/Manila')::date between ':from' and ':to'
group by 1, 2 order by scans desc;
```

This includes the time the person takes to hold the item steady, so it's an upper bound on
the system's own latency. The pure model time per frame is on the soak sheet
([../qa/performance.md](../qa/performance.md)).

## Confidence and feedback

```sql
select count(*)                                                   as locked_results,
       round(avg((d.confidence < 0.35)::int) * 100, 1)            as low_confidence_pct,
       (select count(*) from public.feedback f
          join public.scan_detections fd on fd.id = f.detection_id
          join public.scan_sessions fs on fs.id = fd.session_id
         where fs.institution_id = ':inst'
           and (fs.created_at at time zone 'Asia/Manila')::date between ':from' and ':to') as answers,
       (select round(avg((not f.is_correct)::int) * 100, 1) from public.feedback f
          join public.scan_detections fd on fd.id = f.detection_id
          join public.scan_sessions fs on fs.id = fd.session_id
         where fs.institution_id = ':inst'
           and (fs.created_at at time zone 'Asia/Manila')::date between ':from' and ':to') as wrong_pct
from public.scan_sessions s
join public.scan_detections d on d.session_id = s.id and d.is_primary
where s.institution_id = ':inst'
  and (s.created_at at time zone 'Asia/Manila')::date between ':from' and ':to';
```

## Kiosk uptime

Kiosks send a heartbeat every 5 minutes while running (`/admin` → Kiosks shows hours per
kiosk). Uptime is measured against the **scheduled** hours, here 07:00–19:00 Monday to
Saturday. Change the schedule in the query to match the pilot site.

```sql
with sched as (
  select gs as bucket
  from generate_series((':from')::date + time '07:00', (':to')::date + time '18:55',
                       interval '5 minutes') gs
  where extract(isodow from gs) between 1 and 6
    and gs::time between time '07:00' and time '18:55'
)
select d.label,
       count(*)                                             as scheduled_buckets,
       count(h.bucket)                                      as online_buckets,
       round(count(h.bucket) * 100.0 / nullif(count(*), 0), 1) as uptime_pct
from public.devices d
cross join sched
left join public.kiosk_heartbeats h
  on h.device_id = d.id and (h.bucket at time zone 'Asia/Manila') = sched.bucket
where d.institution_id = ':inst'
group by d.label order by d.label;
```

## Field accuracy

Use [../qa/field-test.md](../qa/field-test.md) (testers answer "Was this right?" for every scan).
