# SPDX-License-Identifier: AGPL-3.0-or-later
"""v1 detection classes (docs/spec.md §3) and the YOLO-World text prompts for each.

The API returns only `class_key`; the web app maps it to a bin via Supabase (D7).
`default_category` is a fallback for clients that have not loaded that mapping yet.

Several prompts may map to one class: zero-shot detectors respond better to
concrete, visual phrases than to our internal names. Prompt order defines the
model's class indices, so changing this list requires rebuilding the weights.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class WasteClass:
    key: str
    default_category: str
    prompts: tuple[str, ...]


WASTE_CLASSES: tuple[WasteClass, ...] = (
    # Recyclable
    WasteClass("plastic_bottle", "recyclable", ("plastic bottle", "plastic water bottle")),
    WasteClass("plastic_cup", "recyclable", ("plastic cup", "plastic milk tea cup")),
    WasteClass("aluminum_can", "recyclable", ("aluminum can", "soda can")),
    WasteClass("glass_bottle", "recyclable", ("glass bottle",)),
    WasteClass("paper_bag", "recyclable", ("paper bag", "brown paper bag")),
    WasteClass("cardboard", "recyclable", ("cardboard box", "piece of cardboard")),
    WasteClass("paper_sheet", "recyclable", ("sheet of paper", "crumpled paper")),
    # Biodegradable
    WasteClass("banana_peel", "biodegradable", ("banana peel", "banana")),
    WasteClass("food_scraps", "biodegradable", ("food scraps", "leftover food", "fruit peel")),
    WasteClass("leaves", "biodegradable", ("dry leaves", "leaf")),
    WasteClass("used_tissue", "biodegradable", ("used tissue paper", "crumpled tissue")),
    # Residual
    WasteClass("snack_wrapper", "residual", ("snack wrapper", "chips bag", "candy wrapper")),
    WasteClass("styrofoam", "residual", ("styrofoam food container", "styrofoam cup")),
    WasteClass("plastic_utensil", "residual", ("plastic spoon", "plastic fork")),
    WasteClass("straw", "residual", ("drinking straw",)),
    WasteClass("tetra_pack", "residual", ("juice carton", "tetra pak drink box")),
    WasteClass("soiled_food_container", "residual", ("dirty food container", "takeout food box")),
    WasteClass("sanitary_napkin", "residual", ("sanitary pad",)),
    WasteClass("face_mask", "residual", ("face mask", "surgical mask")),
    # Hazardous
    WasteClass("battery", "hazardous", ("battery", "AA battery")),
    WasteClass("light_bulb", "hazardous", ("light bulb", "fluorescent lamp")),
    WasteClass("expired_medicine", "hazardous", ("medicine blister pack", "pill bottle")),
    WasteClass("spray_can", "hazardous", ("spray can", "aerosol can")),
)

# Flattened prompt list (model class index -> prompt) and index -> class_key lookup.
PROMPTS: tuple[str, ...] = tuple(p for c in WASTE_CLASSES for p in c.prompts)
PROMPT_TO_CLASS: tuple[WasteClass, ...] = tuple(c for c in WASTE_CLASSES for _ in c.prompts)
CLASS_BY_KEY: dict[str, WasteClass] = {c.key: c for c in WASTE_CLASSES}
