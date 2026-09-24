#!/usr/bin/env python3
"""把 ImageGen 产出的整套手绘场景原图处理成「真透明背景」的可进主包资产。

为什么需要这一步（三次实测得到的教训）：
1. 生图模型对 "transparent background" 的理解是**画一个棋盘格/纸纹底**，
   输出的 PNG 实际完全不透明（RGB、无 alpha）——直接叠层会带着白底糊在场景上。
2. 部分图右下角带平台水印，必须在抠图前裁掉。
3. 主包上限 2MiB，10 张 1024~1536px 原图约 12.9MB，必须缩到显示尺寸再压 webp。

处理管线：
    裁边（去水印） -> 边界连通洪泛抠底（保护云朵/花瓣等内部浅色） -> 羽化 -> 裁透明边 -> 缩放 -> webp

洪泛而非全局抠色的原因：全局「浅色即背景」会把云的亮部、草丛里的白花一起抠穿；
只从图像边界向内扩散，任何被铅笔线/水彩阴影包住的浅色内部都会被保留。

用法：
    python3 scripts/prepare-scene-assets.py
"""
import os
import sys
from collections import deque

import numpy
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENE = os.path.join(ROOT, "assets", "scene")
SOURCE_DIR = os.path.join(ROOT, "design-assets", "scene-source")

# canonical -> (源文件名片段, 最长边, 裁边比例 LTRB, 模式)
# 裁边比例用于去掉平台水印（集中在右下角），只裁装饰画能接受的少量边。
# 模式：
#   erode  —— 枝干/草叶等细碎主体：对残留浅色底做「邻接透明即侵蚀」，否则枝杈间会留下白色色块
#   plain  —— 主体大块浅色（云/蘑菇）：只洪泛抠底 + 去噪点，防止把云的亮部侵蚀掉
#   radial —— 太阳：圆盘主体，直接用径向渐隐蒙版，彻底避免光晕被抠碎
ASSETS = {
    "tree-lush":   ("2026-09-24T20-24-07", 560, (0.02, 0.02, 0.03, 0.03), "erode"),
    "tree-autumn": ("2026-09-24T20-25-43", 560, (0.02, 0.02, 0.10, 0.12), "erode"),
    "tree-winter": ("2026-09-24T20-26-06", 560, (0.02, 0.02, 0.03, 0.03), "erode"),
    "hills-back":  ("2026-09-24T20-26-28", 900, (0.02, 0.02, 0.08, 0.08), "plain"),
    "grass-bank":  ("2026-09-24T20-26-54", 900, (0.02, 0.02, 0.05, 0.07), "erode"),
    "rocks":       ("2026-09-24T20-27-19", 420, (0.02, 0.02, 0.06, 0.06), "erode"),
    "reeds":       ("2026-09-24T20-28-44", 480, (0.02, 0.02, 0.03, 0.03), "erode"),
    "cloud":       ("2026-09-24T20-29-02", 420, (0.02, 0.02, 0.02, 0.02), "plain"),
    "sun":         ("2026-09-24T20-29-51", 360, (0.02, 0.02, 0.02, 0.02), "radial"),
    "mushroom":    ("2026-09-24T20-30-38", 360, (0.02, 0.02, 0.03, 0.03), "plain"),
}

# 背景判据：够亮 + 低饱和（覆盖纯白底与浅灰棋盘/纸纹底）。
BG_MIN_CHANNEL = 203
BG_MAX_CHROMA = 22
# 个别图自带更深的纸纹底（如冬季树的灰蓝wash），需要放宽阈值才能抠干净。
# key: (min_channel, max_chroma[, cool]) —— cool=True 时额外要求偏冷或中性
#（冬季树：底是冷灰 wash、枝干是暖棕，用冷暖就能分开；否则封闭 wash 湖抠不掉）。
THRESHOLDS = {
    "tree-winter": (172, 40, True),
}
# 枝杈围出的封闭 wash 湖比默认侵蚀深度大：树冠/草丛内部残留白块需要更深侵蚀。
# 侵蚀只吃「贴着透明区的浅色低饱和像素」，彩色笔触主体不受影响，所以可以放心加深。
ERODE_ITERATIONS = {"tree-winter": 220, "tree-lush": 90, "tree-autumn": 90, "grass-bank": 90, "rocks": 60, "reeds": 60}
# 草坡原图是整片高草甸，直接铺在场景里会盖住一切；只保留底部作为前景矮草带。
BOTTOM_KEEP = {"grass-bank": 0.42}
# 裁剪/抠图后的矩形边界用「边缘渐隐」融进场景：alpha 在四边按比例渐隐到 0，
# 元素看起来是 soft-edged 的水彩拼贴，而不是贴上去的贴纸。
EDGE_FADE = {"grass-bank": 0.16}
WEBP_QUALITY = 82


def find_source(stamp):
    if not os.path.isdir(SOURCE_DIR):
        return None
    for name in sorted(os.listdir(SOURCE_DIR)):
        if stamp in name and name.lower().endswith(".png"):
            return os.path.join(SOURCE_DIR, name)
    return None


def crop_margins(img, margins):
    w, h = img.size
    l, t, r, b = margins
    box = (int(w * l), int(h * t), int(w * (1 - r)), int(h * (1 - b)))
    if box[0] >= box[2] or box[1] >= box[3]:
        return img
    return img.crop(box)


def background_mask(rgb, thr):
    """候选背景像素：亮且低饱和（可选：只认偏冷/中性的底）。"""
    arr = numpy.asarray(rgb, dtype=numpy.int16)
    mn = arr.min(axis=2)
    mx = arr.max(axis=2)
    mask = (mn >= thr[0]) & ((mx - mn) <= thr[1])
    if len(thr) > 2 and thr[2]:
        mask &= arr[:, :, 2] >= (arr[:, :, 0] - 6)
    return mask


def flood_from_border(mask):
    """只保留与图像边界连通的候选背景；孤立的浅色内部（云/花）不受影响。"""
    h, w = mask.shape
    visited = numpy.zeros((h, w), dtype=bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if mask[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if mask[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        if y > 0 and mask[y - 1, x] and not visited[y - 1, x]:
            visited[y - 1, x] = True
            dq.append((y - 1, x))
        if y < h - 1 and mask[y + 1, x] and not visited[y + 1, x]:
            visited[y + 1, x] = True
            dq.append((y + 1, x))
        if x > 0 and mask[y, x - 1] and not visited[y, x - 1]:
            visited[y, x - 1] = True
            dq.append((y, x - 1))
        if x < w - 1 and mask[y, x + 1] and not visited[y, x + 1]:
            visited[y, x + 1] = True
            dq.append((y, x + 1))
    return visited


def key_out(rgb, thr):
    mask = background_mask(rgb, thr)
    bg = flood_from_border(mask)
    alpha = numpy.where(bg, 0, 255).astype(numpy.uint8)
    a = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(1.1))
    return a


def bg_like(rgb, thr):
    arr = numpy.asarray(rgb, dtype=numpy.int16)
    mn = arr.min(axis=2)
    mx = arr.max(axis=2)
    mask = (mn >= thr[0]) & ((mx - mn) <= thr[1])
    if len(thr) > 2 and thr[2]:
        mask &= arr[:, :, 2] >= (arr[:, :, 0] - 6)
    return mask


def erode_halo(rgb, opaque, thr, iterations=16):
    """侵蚀「贴着透明区的残留浅色底」：枝杈间的白块会一步步被吃掉，
    而被彩色笔触包住的内部浅色（云的亮部、花瓣）没有透明邻居，不受影响。"""
    bglike = bg_like(rgb, thr)
    a = opaque.copy()
    for _ in range(iterations):
        trans = ~a
        nb = numpy.zeros_like(a)
        nb[1:, :] |= trans[:-1, :]
        nb[:-1, :] |= trans[1:, :]
        nb[:, 1:] |= trans[:, :-1]
        nb[:, :-1] |= trans[:, 1:]
        newly = bglike & nb & a
        if not newly.any():
            break
        a &= ~newly
    return a


def radial_mask(size, inner=0.66, outer=0.90):
    """柔和的圆形渐隐蒙版（用于太阳这类圆盘主体）：
    inner 以内不透明，inner~outer 线性渐隐，outer 以外全透明（硬切掉光晕噪点）。"""
    w, h = size
    yy, xx = numpy.mgrid[0:h, 0:w]
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    r = numpy.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    edge = min(w, h) / 2.0
    t = numpy.clip((r - edge * inner) / (edge * (outer - inner)), 0, 1)
    return ((1 - t) * 255).astype(numpy.uint8)


def edge_fade(img, fraction):
    """四边 alpha 渐隐：让裁剪出来的带状元素边缘融进背景。"""
    w, h = img.size
    fade_x = max(1, int(w * fraction))
    fade_y = max(1, int(h * fraction))
    a = numpy.asarray(img.getchannel("A"), dtype=numpy.float32)
    ramp_x = numpy.minimum(numpy.arange(w) / fade_x, (w - 1 - numpy.arange(w)) / fade_x)
    ramp_y = numpy.minimum(numpy.arange(h) / fade_y, (h - 1 - numpy.arange(h)) / fade_y)
    ramp = numpy.minimum(1.0, numpy.minimum(ramp_x[None, :], ramp_y[:, None]))
    a *= ramp
    return img.putalpha(Image.fromarray(a.astype(numpy.uint8), "L"))


def keep_bottom(img, fraction):
    """竖向裁剪：只保留底部 fraction（用于把高草甸压成前景矮草带）。"""
    if fraction >= 1.0:
        return img
    w, h = img.size
    return img.crop((0, int(h * (1 - fraction)), w, h))


def trim(img, pad=2, threshold=8):
    bbox = img.getchannel("A").point(lambda v: 255 if v > threshold else 0).getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(img.size[0], r + pad)
    b = min(img.size[1], b + pad)
    return img.crop((l, t, r, b))


def resize(img, max_side):
    w, h = img.size
    scale = min(1.0, max_side / float(max(w, h)))
    if scale >= 1.0:
        return img
    return img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)


def main():
    os.makedirs(SCENE, exist_ok=True)
    total = 0
    missing = []
    report = []
    for canonical, (stamp, max_side, margins, mode) in ASSETS.items():
        src = find_source(stamp)
        if not src:
            missing.append(canonical)
            continue
        img = crop_margins(Image.open(src).convert("RGB"), margins)
        thr = THRESHOLDS.get(canonical, (BG_MIN_CHANNEL, BG_MAX_CHROMA))
        alpha = key_out(img, thr)
        opaque = numpy.asarray(alpha, dtype=numpy.uint8) > 128
        if mode == "erode":
            opaque = erode_halo(img, opaque, thr, iterations=ERODE_ITERATIONS.get(canonical, 16))
        clean = Image.fromarray(numpy.where(opaque, 255, 0).astype(numpy.uint8), "L")
        # 去噪点：孤立的小亮斑（抠图残留）用中值滤波清掉，再轻微羽化边缘。
        clean = clean.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
        if mode == "radial":
            radial = Image.fromarray(radial_mask(img.size), "L")
            clean = Image.fromarray(
                numpy.minimum(numpy.asarray(clean), numpy.asarray(radial)).astype(numpy.uint8), "L"
            )
        out = img.convert("RGBA")
        out.putalpha(clean)
        if canonical in BOTTOM_KEEP:
            out = keep_bottom(out, BOTTOM_KEEP[canonical])
        if canonical in EDGE_FADE:
            edge_fade(out, EDGE_FADE[canonical])
        out = trim(resize(out, max_side))
        path = os.path.join(SCENE, canonical + ".webp")
        out.save(path, "WEBP", quality=WEBP_QUALITY, method=6, exact=False)
        size = os.path.getsize(path)
        total += size
        kept = sum(1 for v in out.getchannel("A").getdata() if v > 128) / (out.size[0] * out.size[1])
        report.append("%-12s %4dx%-4d kept=%4.1f%%  %7.1f KB" % (canonical, out.size[0], out.size[1], kept * 100, size / 1024.0))

    print("\n".join(report))
    print("-" * 44)
    print("total %.1f KB (%d files)" % (total / 1024.0, len(ASSETS) - len(missing)))
    if missing:
        print("MISSING source for: " + ", ".join(missing))
        return 1
    # 主体保留率异常说明抠图策略对这张图失效（整张被抠空或整张没抠）。
    broken = [r for r in report if float(r.split("kept=")[1].split("%")[0]) < 3]
    if broken:
        print("SUSPECT (subject nearly gone):")
        for r in broken:
            print("  " + r)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
