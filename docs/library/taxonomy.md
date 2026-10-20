# Library taxonomy v1 (Phase 27)

How the disposal library is organised. Codes are stable IDs used in the content sheets
(Phase 28); names can change, codes can't.

## Bins (the answer people see first)

The four app bins map one-to-one to RA 9003's required container labels (`S-RA9003-22`):

| App bin | RA 9003 label | Code |
|---|---|---|
| Green · Biodegradable | "compostable" | `biodegradable` |
| Blue · Recyclable | "recyclable" (clean and dry, `S-RA9003-3Z`) | `recyclable` |
| Black · Residual | "non-recyclable" | `residual` |
| Red · Hazardous | "special waste" (`S-RA9003-3PP`) | `hazardous` |

## Destinations (where else it can go)

An item has **one bin** (where it goes if you only have the four bins) and **zero or more
destinations**, ranked. The app shows the best realistic option first.

| Code | Destination | Example |
|---|---|---|
| `bin` | the bin above | default |
| `junkshop` | junk shop / "magbobote" (buys or accepts) | PET, cans, cardboard, glass bottles, scrap metal |
| `program` | city or brand programme | QC Trash to Cashback (`S-QC-T2C`), brand take-back (`S-RA11898`) |
| `ewaste` | registered e-waste drop-off (`S-DAO2013-22`) | phones, chargers, cables |
| `hazdrop` | hazardous/special-waste collection | batteries, paint, lamps, chemicals |
| `takeback` | retailer/producer take-back | lamps (`S-JAO-LAMPS`), batteries, tires |
| `health` | barangay health centre / pharmacy | sharps, medicine (gap: verify locally) |
| `compost` | home or community compost | food scraps, leaves |
| `donate` | donate / sell second-hand | clothes, working devices, furniture |
| `repair` | repair shop / fix it | shoes, bags, small appliances |
| `bulky` | LGU bulky-waste pickup | mattress, furniture |
| `special` | special handling (construction debris, tires) | hollow blocks, car tires |

## Material groups and subgroups

| Group code | Group | Subgroups (code: name) | Default bin |
|---|---|---|---|
| `PLA` | Plastics | `PLA-1` #1 PET · `PLA-2` #2 HDPE · `PLA-3` #3 PVC · `PLA-4` #4 LDPE · `PLA-5` #5 PP · `PLA-6` #6 PS (incl. styrofoam) · `PLA-7` #7 Other · `PLA-FILM` films & bags · `PLA-FLEX` sachets & flexible multilayer | depends on subgroup |
| `PAP` | Paper & cardboard | `PAP-CLEAN` clean paper · `PAP-BOARD` cardboard & cartons · `PAP-COAT` coated/waxed/laminated · `PAP-THERM` thermal (receipts) · `PAP-TISSUE` tissue & napkins · `PAP-SOIL` food-soiled paper | recyclable (if clean) |
| `MET` | Metals | `MET-AL` aluminum · `MET-FE` steel/tin cans · `MET-AERO` aerosols · `MET-FOIL` foil & trays · `MET-SCRAP` scrap & wire | recyclable |
| `GLA` | Glass | `GLA-CONT` bottles & jars · `GLA-FLAT` window & mirror · `GLA-HEAT` heat-resistant (Pyrex) & drinking glasses · `GLA-BROKEN` broken glass | recyclable (containers only) |
| `CER` | Ceramics & porcelain | `CER-DISH` dishware · `CER-TILE` tiles · `CER-POT` clay & terracotta | residual |
| `TEX` | Textiles & footwear | `TEX-CLOTH` clothing · `TEX-HOME` household textiles · `TEX-SHOE` footwear · `TEX-BAG` bags | residual (donate first) |
| `ELE` | Electronics (e-waste) | `ELE-SMALL` small devices · `ELE-CABLE` cables & chargers · `ELE-ACC` accessories · `ELE-LARGE` appliances | hazardous (special) |
| `BAT` | Batteries | `BAT-ALK` alkaline/zinc · `BAT-LI` lithium-ion & power banks · `BAT-BTN` button/coin cells · `BAT-PB` lead-acid | hazardous |
| `LIG` | Lighting | `LIG-FLUO` fluorescent & CFL · `LIG-LED` LED · `LIG-INC` incandescent & halogen · `LIG-STRING` string lights | hazardous (fluorescent) / residual (incandescent) |
| `ORG` | Organics | `ORG-FOOD` food scraps · `ORG-GARDEN` garden waste · `ORG-OIL` cooking oil & fats · `ORG-BONE` bones & shells | biodegradable |
| `WOO` | Wood & natural | `WOO-RAW` untreated wood & bamboo · `WOO-TREAT` treated/painted wood · `WOO-CORK` cork | biodegradable (untreated, small) |
| `RUB` | Rubber & foam | `RUB-RUB` rubber · `RUB-FOAM` foam & cushions · `RUB-TIRE` tires | residual |
| `CMP` | Composites & multilayer | `CMP-CARTON` Tetra Pak & cartons · `CMP-BLISTER` blister packs · `CMP-TUBE` tubes · `CMP-MIXED` mixed-material items | residual |
| `MED` | Medical & sanitary | `MED-SHARP` sharps · `MED-DRUG` medicine · `MED-PPE` masks & gloves · `MED-SAN` diapers & sanitary products · `MED-TEST` test kits | residual / hazardous (sharps, medicine) |
| `HHW` | Household hazardous | `HHW-PAINT` paints & thinners · `HHW-CHEM` cleaning chemicals · `HHW-PEST` pesticides · `HHW-AUTO` motor oil & automotive · `HHW-COSM` nail polish, solvents | hazardous |
| `BLK` | Bulky & special | `BLK-FURN` furniture · `BLK-MATT` mattresses · `BLK-APPL` large appliances · `BLK-CONST` construction debris | bulky / special |

**Plastics note:** the resin code (the number in the triangle) identifies the plastic. It does
**not** mean the item is recyclable where you are (`S-STD-RIC`). In the Philippines, junk
shops commonly buy #1 PET and #2 HDPE; other codes vary.

## Links to the scanner

The 23 classes the model detects map to library items (`detectable_class_key`). Where one class
covers several items, the app asks **"Which one is yours?"** (Phase 30):

| Model class | Library items it can mean (examples) |
|---|---|
| `plastic_bottle` | PET water/soda bottle (#1), HDPE shampoo/detergent bottle (#2), cooking-oil bottle (#1/#2) |
| `plastic_cup` | PP/PET cold-drink cup, PS cup |
| `glass_bottle` | beverage bottle, sauce/jar, medicine bottle |
| `paper_sheet` | office paper, receipt (thermal), glossy magazine |
| `cardboard` | corrugated box, cereal box, pizza box (soiled) |
| `snack_wrapper` | chip bag (multilayer), candy wrapper, biscuit tray |
| `battery` | alkaline AA/AAA, button cell, Li-ion phone battery |
| `light_bulb` | CFL/fluorescent, LED, incandescent |
| `expired_medicine` | blister pack with tablets, medicine bottle, syrup |
| `spray_can` | empty aerosol, aerosol with product left |
| `tetra_pack` | juice/milk carton |

## Targets (from ROADMAP-v2)

v1.1: **≥ 250 items**, **≥ 10 per group**, 100% EN + FIL. v2.x: 500+.
