# Bin contamination audit (Phase 25, task 6, optional before/after study)

Tests the proposal's core claim: with iTapon, fewer items end up in the wrong bin.

## Design

- **Where:** the same bins at the pilot location(s).
- **Before:** 3 weekdays **before** any iTapon poster or kiosk is up (week 1).
- **During:** 3 weekdays in **week 3** of the pilot (same weekdays and times as "before").
- **When:** at the normal collection time (e.g. 15:00), before janitorial staff empty the bins.
- Same auditors both times. Agree on the rules ([docs/spec.md](../spec.md) §4 mapping) beforehand.

## Procedure (with gloves, tongs and a tarp)

1. For each bin, take out the items one at a time (or a fixed sample of up to 40 items if
   it's very full; note the sample size).
2. Count **items_total** and **items_wrong**: an item is wrong if its correct bin per
   spec §4 is a different bin. Liquids and loose crumbs aren't counted.
3. Photograph the sorted pile **without people or ID cards**, for the appendix.
4. Return everything to the right bin, or as the janitorial staff prefer.

## Recording (→ `contamination.csv`)

| phase | date | location | bin | items_total | items_wrong |
|---|---|---|---|---|---|
| before | 2026-11-03 | Canteen | Green | 38 | 11 |
| before | 2026-11-03 | Canteen | Blue | 40 | 15 |

`phase` is `before` or `during`; `bin` is Green, Blue, Black or Red.

The report script gives per-bin and overall contamination rates before vs during, the change in
percentage points, and a two-proportion z-test p-value. **Report the limits honestly:** it's not
a randomised trial (other things can change between weeks), and the sample sizes are small.
