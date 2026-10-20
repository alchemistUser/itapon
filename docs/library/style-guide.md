# Library writing & safety guide (Phase 27)

## Voice

- **Plain and direct.** Grade 6–8 reading level. Second person, imperative: "Rinse it." not
  "The item should be rinsed."
- **The bin first.** Every summary names the bin or the best destination in the first clause.
- **Short.** Summary ≤ 140 characters; each prep step ≤ 60; facts ≤ 200.
- **Friendly, never shaming.** "Easy fix: rinse it first." not "Dirty bottles ruin recycling."
- **No brand bashing.** Use generic names ("instant coffee sachet", not a brand).
- **Words people use.** Prefer "styrofoam" over "expanded polystyrene" and give the technical name in
  the group page.

## Filipino

- Natural, conversational Filipino (Taglish is fine where it's what people say:
  "junk shop", "sachet", "power bank").
- Colours of bins: *berde* (green), *asul* (blue), *itim* (black), *pula* (red).
- Keep numbers and resin codes as digits.
- Aliases include common Filipino and Taglish search words (bote, lata, karton, upos, baterya).

## Accuracy rules

1. **Every rule or destination has a source** from [sources.md](sources.md). Opinions and
   tips (reuse ideas) don't need one; **facts do**.
2. **National default + local override.** The `bin` follows national rules (RA 9003).
   Quezon City differences go in `local_qc_*` ("In Quezon City: …").
3. **Don't over-promise recycling.** If junk shops rarely accept it, say "Black bin; some junk
   shops accept clean ones" instead of "recyclable".
4. **Dirty vs clean.** Food-soiled paper, greasy containers and wet items go to residual
   unless the material is compostable (RA 9003 recyclables must be free from contamination).
5. **Programmes change.** Anything about a programme, booth or accepted item list gets
   `local_qc_*` + a source and is re-checked every release.

## Safety rules (hard rules; the validator enforces them)

- **No DIY for hazardous items**: batteries, lamps, chemicals, paints, pesticides, aerosols,
  medicine, sharps, e-waste. No reuse ideas, no "open it", no "drain it", no "burn it".
- **Never** suggest burning anything (RA 9003 Sec. 48), pouring oil or chemicals down drains,
  or putting batteries in any bin other than red/special.
- **Batteries:** tape the terminals, keep them dry, and don't puncture them (lithium-ion can catch fire).
- **Broken glass, ceramics, sharps:** wrap or seal so collectors aren't cut; label "BASAG"/"SHARPS".
- **Medicine & sharps:** until a local rule is confirmed, use only: *"Seal it in a hard container and
  ask your barangay health centre or pharmacy."* (see the gaps in [sources.md](sources.md)).
- **Mercury lamps:** don't break them; if one breaks, air out the room, don't vacuum, and collect the pieces with stiff paper into a sealed jar.

## Review workflow

1. **Draft** (Claude or a team member) with sources filled in.
2. **Review** by a team member: checks the bin, destinations and sources, and that the Filipino is
   natural. Hazardous/medical/e-waste items need **two** team reviewers.
3. **Published** only after the validator passes and the reviewer(s) sign the row.
4. Any "report a problem" from users sends the item back to review.

## AI-drafted content (D19)

Claude drafts entries from the sources in the register and must:
- cite only sources in [sources.md](sources.md) (add new ones there first, with a link);
- never invent a programme, address, schedule or drop-off point. Those come from the team's
  local research;
- leave `status = draft`. Nothing AI-written is published without the team's review.
