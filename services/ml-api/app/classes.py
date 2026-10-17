# SPDX-License-Identifier: AGPL-3.0-or-later
"""v1 detection classes (docs/spec.md §3) and the YOLO-World text prompts for each.

The API returns only `class_key`; the web app maps it to a bin via Supabase (D7).
`default_category` is a fallback for clients that have not loaded that mapping yet.

Several prompts may map to one class: zero-shot detectors respond better to
concrete, visual phrases than to our internal names. Prompt order defines the
model's class indices, so changing this list requires rebuilding the weights.

NOT_WASTE holds distractor prompts for everyday objects that are not trash (F9-2).
Without them, the model forces any object into the nearest waste class. With them,
class-agnostic NMS keeps whichever prompt fits best, and not-waste boxes are
dropped by the API and the web decoder.
"""

from dataclasses import dataclass

# Bump when prompts change; recorded in the weights' metadata and labels.json.
MODEL_VERSION = "world-v0.2"


@dataclass(frozen=True)
class WasteClass:
    key: str
    default_category: str
    prompts: tuple[str, ...]
    ignore: bool = False


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

NOT_WASTE = WasteClass(
    "not_waste",
    "none",
    # Deliberately excluded (tested 2026-10-17, see services/ml-api/README.md):
    # - mug/glass prompts ("ceramic mug", "coffee mug", "drinking glass", "ceramic mug
    #   with a handle"…) also swallow real plastic cups (0.88–0.98) → needs a trained model.
    # - "human hand": items are held in hand at kiosks; a hand box could suppress the item.
    # - "pen": competes with straws and plastic utensils.
    (
        "mobile phone",
        "person",
        "keys",
        "eyeglasses",
        "laptop",
        "remote control",
        "wallet",
    ),
    ignore=True,
)

# Every class the model knows, waste first. NOT_WASTE comes last so the waste
# prompts keep their v0.1 class indices.
MODEL_CLASSES: tuple[WasteClass, ...] = (*WASTE_CLASSES, NOT_WASTE)

# Flattened prompt list (model class index -> prompt) and index -> class lookup.
PROMPTS: tuple[str, ...] = tuple(p for c in MODEL_CLASSES for p in c.prompts)
PROMPT_TO_CLASS: tuple[WasteClass, ...] = tuple(c for c in MODEL_CLASSES for _ in c.prompts)
CLASS_BY_KEY: dict[str, WasteClass] = {c.key: c for c in WASTE_CLASSES}
