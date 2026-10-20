# Library entry template (Phase 27)

One row per item in the material group's sheet (Phase 28 turns sheets into the database).
**Required** fields must be filled before review; the validator (Phase 28) enforces them.

| Column | Req. | Rules |
|---|---|---|
| `slug` | ✔ | lowercase, `-` separated, unique: `pet-water-bottle` |
| `name_en` / `name_fil` | ✔ | singular, everyday words ("Plastic water bottle" / "Boteng plastik ng tubig") |
| `aliases` | ✔ | `;`-separated: Taglish, brand-generic words, misspellings ("mineral water;bote;boteng mineral") |
| `material` | ✔ | subgroup code from [taxonomy.md](taxonomy.md): `PLA-1` |
| `resin_code` | plastics | 1–7 or empty |
| `bin` | ✔ | `biodegradable` · `recyclable` · `residual` · `hazardous` |
| `destinations` | ✔ | ranked codes `;`-separated: `junkshop;program;bin` |
| `summary_en` / `summary_fil` | ✔ | ≤ 140 chars: the result-card line |
| `prep_en` / `prep_fil` | ✔ | steps separated by `|`: "Empty it \| Rinse \| Flatten \| Keep the cap on" |
| `dont_en` / `dont_fil` | | common mistakes: "Don't burn it" |
| `hazard_en` / `hazard_fil` | hazardous/medical | what can go wrong and why |
| `value` | | `buys` (junk shop pays) · `accepts` · `none` |
| `reuse_en` / `reuse_fil` | | `|`-separated ideas; **never for hazardous items** |
| `reduce_en` / `reduce_fil` | | swaps/avoidance ideas |
| `fact_en` / `fact_fil` | | one fact; **requires `sources`** |
| `local_qc_en` / `local_qc_fil` | | Quezon City difference or programme ("In Quezon City: …") |
| `related` | | slugs of related or commonly confused items |
| `detectable_class_key` | | model class if the scanner can detect it |
| `sources` | ✔ | source IDs from [sources.md](sources.md), `;`-separated |
| `status` | ✔ | `draft` → `reviewed` → `published` |
| `reviewed_by` / `reviewed_at` | to publish | team member initials + date; **hazardous/medical: two reviewers** |

## Worked example: PET water bottle

| Column | Value |
|---|---|
| slug | `pet-water-bottle` |
| name_en / name_fil | Plastic water bottle / Boteng plastik ng tubig |
| aliases | mineral water bottle;PET bottle;softdrinks bottle;bote;boteng mineral |
| material / resin_code | `PLA-1` / 1 |
| bin | `recyclable` |
| destinations | `junkshop;program;bin` |
| summary_en | Empty and rinse it, flatten it, then sell it to a junk shop or put it in the blue bin. |
| summary_fil | Ubusin at banlawan, pitpitin, saka ibenta sa junk shop o ilagay sa asul na basurahan. |
| prep_en | Empty it \| Rinse it \| Flatten it to save space \| Put the cap back on |
| dont_en | Don't burn it \| Don't put it in the blue bin with food or drink still inside |
| value | `buys` |
| reuse_en | Use it as a plant pot or seedling starter \| Refill it for watering plants |
| reduce_en | Bring a refillable tumbler \| Use water refill stations |
| fact_en | Recyclables must be clean to be recycled. A bottle with leftover drink can spoil a whole bag of recyclables. |
| local_qc_en | In Quezon City: trade PET bottles for Environmental Points at Trash to Cashback booths. |
| related | `hdpe-shampoo-bottle;plastic-cup-pp` |
| detectable_class_key | `plastic_bottle` |
| sources | `S-RA9003-22;S-RA9003-3Z;S-QC-T2C;S-STD-RIC` |
| status | `draft` |

(Filipino for the other text fields follows the same pattern and is required before review.)
