#!/usr/bin/env python3
"""Slice AI-generated sprite sheets into individual game sprites.

- Flood-fills magenta background from borders to build alpha (chroma key).
- Premultiplies before LANCZOS downscale to avoid fringes.
- Trims to content bbox, records anchor, writes manifest.json.
"""
import json, os, sys
from PIL import Image
import numpy as np
from collections import deque

RAW = os.path.join(os.path.dirname(__file__), "..", "raw")
OUT = os.path.join(os.path.dirname(__file__), "..", "game", "assets", "sprites")

MAGENTA = np.array([255, 0, 255], dtype=np.int16)


def crop_dark_borders(img: Image.Image) -> Image.Image:
    a = np.array(img.convert("RGB")).astype(np.int16)
    h, w, _ = a.shape
    dark = (a.sum(axis=2) < 200)
    x0, y0, x1, y1 = 0, 0, w, h
    while y0 < h and dark[y0].mean() > 0.6: y0 += 1
    while y1 > y0 and dark[y1 - 1].mean() > 0.6: y1 -= 1
    while x0 < w and dark[:, x0].mean() > 0.6: x0 += 1
    while x1 > x0 and dark[:, x1 - 1].mean() > 0.6: x1 -= 1
    return img.crop((x0, y0, x1, y1))


def key_alpha(img: Image.Image, tol=160) -> Image.Image:
    img = crop_dark_borders(img)
    a = np.array(img.convert("RGB")).astype(np.int16)
    dist = np.abs(a - MAGENTA).sum(axis=2)
    mag = dist < tol
    rgba = np.array(img.convert("RGBA"))
    rgba[mag, 3] = 0
    # recolor drawn purple "shadow" blobs (magenta-ish, low green) to neutral dark shade
    r, g, b = rgba[..., 0].astype(int), rgba[..., 1].astype(int), rgba[..., 2].astype(int)
    purple = (rgba[..., 3] > 0) & (b > r - 40) & (g < 90) & (r > 100) & (b > 100)
    rgba[purple, 0] = 52; rgba[purple, 1] = 40; rgba[purple, 2] = 62
    # fringe cleanup: semi-magenta pixels adjacent to transparent become transparent
    semi = (dist < tol * 2)
    tr = rgba[:, :, 3] == 0
    adj = tr.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        adj |= np.roll(tr, dy, axis=0) if dy else np.roll(tr, dx, axis=1)
    kill = semi & adj
    rgba[kill, 3] = 0
    return Image.fromarray(rgba, "RGBA")


def downscale_premul(img: Image.Image, size) -> Image.Image:
    a = np.array(img).astype(np.float32) / 255.0
    rgb, al = a[..., :3], a[..., 3:4]
    pre = rgb * al
    pre_img = Image.fromarray((np.concatenate([pre, al], axis=-1) * 255).astype(np.uint8), "RGBA")
    pre_img = pre_img.resize(size, Image.LANCZOS)
    b = np.array(pre_img).astype(np.float32) / 255.0
    al2 = b[..., 3]
    keep = al2 > 0.5
    rgb2 = np.where(al2[..., None] > 0.001, b[..., :3] / np.maximum(al2[..., None], 0.001), 0)
    rgb2 = np.clip(rgb2, 0, 1)
    # darken magenta-ish fringe pixels (edge pixels) into a dark plum shade
    r, g, bl = rgb2[..., 0], rgb2[..., 1], rgb2[..., 2]
    tr = keep
    edge = np.zeros_like(tr)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        sh = np.roll(tr, dy, axis=0) if dy else np.roll(tr, dx, axis=1)
        edge |= (~sh) & tr
    magish = (r > 0.45) & (bl > 0.4) & (g < r - 0.2)
    repl = edge & magish
    rgb2 = np.where(repl[..., None], np.array([0.16, 0.10, 0.20]), rgb2)
    out = np.concatenate([rgb2, keep[..., None]], axis=-1)
    return Image.fromarray((out * 255).astype(np.uint8), "RGBA")


def bbox_trim(img: Image.Image):
    a = np.array(img)[:, :, 3]
    ys, xs = np.where(a > 0)
    if len(xs) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


SHEETS = {
    # name: dict(grid=(cols,rows), cell, keyed, inset_crop, scale_factor, names=[...], anchor='bottom'|'center')
    "ground": dict(grid=(4, 4), cell=256, keyed=False, inset=28, size=32, anchor="tile",
                   names=["grass", "grass_dry", "dirt", "sand", "gravel", "asphalt", "paving",
                          "brick_pave", "snow", "autumn_leaves", "mud", "moss", "water",
                          "field", "asphalt_old", "grass_flowers"]),
    "nature": dict(grid=(4, 4), cell=256, keyed=True, size=64, anchor="bottom",
                   names=["tree_young", "tree_birch", "tree_fir", "bush", "flowers", "rocks",
                          "tree_autumn", "tree_winter", "bush_berries", "reeds", "hedge",
                          "pumpkins", "tree_xmas", "woodpile", "flowerbed", "sapling"]),
    "bldg_res": dict(grid=(4, 4), cell=256, keyed=True, size=64, anchor="bldg",
                     names=["izba", "house_wood2", "khrush", "tower9", "brick_modern",
                            "pastel_block", "cottage", "izba_green", "courtyard_pair",
                            "barracks", "house_garage", "block_dishes", "khrush_snow",
                            "house_yellow", "townhouses", "house_greenhouse"]),
    "bldg_civic": dict(grid=(4, 4), cell=256, keyed=True, size=64, anchor="bldg",
                       names=["townhall", "school", "hospital", "firestation", "police",
                              "church", "culture", "kindergarten", "polyclinic", "library",
                              "sport", "boilerhouse", "watertower", "substation", "station",
                              "museum"]),
    "bldg_econ": dict(grid=(4, 4), cell=256, keyed=True, size=64, anchor="bldg",
                      names=["factory", "warehouse", "gasstation", "garage", "supermarket",
                             "grocery", "cafe", "bakery", "bank", "it_office", "greenhouses",
                             "sawmill", "hotel", "cinema", "market", "barn"]),
    "vehicles": dict(grid=(4, 4), cell=256, keyed=True, size=64, anchor="center",
                     names=["lada_white", "hatch_red", "sedan_silver", "taxi", "uaz_green",
                            "truck_blue", "kamaz", "bus", "marshrutka", "tram", "ambulance",
                            "police_car", "fire_truck", "snowplow", "tanker", "van_blue"]),
    "people": dict(grid=(4, 4), cell=256, keyed=True, size=32, anchor="bottom",
                   names=["man", "woman", "babushka", "ded", "kid", "schoolgirl", "worker",
                          "businessman", "tourist", "summer_girl", "policeman", "doctor",
                          "musician", "fisherman", "winter_person", "cat"]),
    "props": dict(grid=(4, 4), cell=256, keyed=True, size=32, anchor="bottom",
                  names=["bench", "lamp", "bin", "fence_wood", "busstop", "stall", "kiosk",
                         "slide", "swings", "sandbox", "fountain", "monument", "billboard",
                         "traffic_light", "planter", "well"]),
    "icons": dict(grid=(4, 4), cell=256, keyed=True, size=32, anchor="center",
                  names=["coin", "coins", "house", "people", "heart", "star", "job", "fuel",
                         "bolt", "drop", "flame", "travel", "tree", "wrench", "megaphone",
                         "news"]),
    "widgets": dict(grid=(4, 4), cell=256, keyed=True, size=64, anchor="center",
                    names=["panel_wood", "panel_paper", "btn", "btn_pressed", "slot",
                           "tooltip", "bar_bg", "bar_fill", "window", "close_btn", "scrollbar",
                           "divider", "badge_red", "badge_green", "frame_portrait", "corner"]),
    "effects": dict(grid=(4, 4), cell=256, keyed=True, size=16, anchor="center", prefix="fx",
                    names=["smoke", "smoke_big", "heart", "sparkle", "snowflake", "leaf",
                           "shine", "boom", "zzz", "note", "glow", "dust", "pigeon_fly",
                           "pigeon", "duck", "steam"]),
    "portraits": dict(grid=(2, 2), cell=512, keyed=True, size=96, anchor="center",
                      names=["mayor", "assistant", "babushka", "reporter"]),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for sheet, cfg in SHEETS.items():
        path = os.path.join(RAW, f"sheet_{sheet}.png")
        if not os.path.exists(path):
            print("skip (missing)", sheet)
            continue
        img = Image.open(path).convert("RGBA")
        cols, rows = cfg["grid"]
        cw, chh = img.width // cols, img.height // rows
        for r in range(rows):
            for c in range(cols):
                idx = r * cols + c
                name = cfg["names"][idx]
                cellimg = img.crop((c * cw, r * chh, (c + 1) * cw, (r + 1) * chh))
                if cfg.get("inset"):
                    i = cfg["inset"]
                    cellimg = cellimg.crop((i, i, cellimg.width - i, cellimg.height - i))
                if cfg["keyed"]:
                    cellimg = key_alpha(cellimg)
                target = cfg["size"]
                # scale keeping aspect; fit into target box (or exact for tiles)
                if cfg["anchor"] == "tile":
                    newsize = (target, target)
                else:
                    bb = bbox_trim(cellimg)
                    if bb is None:
                        print("empty", sheet, name); continue
                    cellimg = cellimg.crop(bb)
                    w, h = cellimg.size
                    scale = min(target / w, target / h)
                    # snap scale so art pixels stay chunky: round to nice factor
                    newsize = (max(2, int(round(w * scale))), max(2, int(round(h * scale))))
                cellimg = downscale_premul(cellimg, newsize)
                w, h = cellimg.size
                anchor = cfg["anchor"]
                if anchor == "tile":
                    ax, ay = w // 2, h // 2
                elif anchor == "center":
                    ax, ay = w // 2, h // 2
                elif anchor == "bottom":
                    ax, ay = w // 2, h - 1
                else:  # bldg: bottom of building mass ~ 80% height
                    ax, ay = w // 2, int(h * 0.80)
                fname = f"{sheet}__{name}.png"
                cellimg.save(os.path.join(OUT, fname))
                manifest[f"{cfg.get('prefix', sheet)}.{name}"] = dict(f=f"sprites/{fname}", w=w, h=h, ax=ax, ay=ay)
    with open(os.path.join(OUT, "..", "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print("sprites:", len(manifest))


if __name__ == "__main__":
    main()
