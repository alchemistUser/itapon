# SPDX-License-Identifier: AGPL-3.0-or-later
"""Fine-tune MobileNetV2 (ImageNet weights) on the archive-v2 set and export it to ONNX.

Same contract as the package model the app already runs: 192x192 input, RGB float 0-255 NHWC
(the rescaling is inside the graph), softmax output in the order of the labels file.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision

SEED = 20261103


class Net(nn.Module):
    def __init__(self, n: int, pretrained: bool) -> None:
        super().__init__()
        w = torchvision.models.MobileNet_V2_Weights.IMAGENET1K_V1 if pretrained else None
        m = torchvision.models.mobilenet_v2(weights=w)
        self.features = m.features
        self.drop = nn.Dropout(0.3)
        self.fc = nn.Linear(1280, n)

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # x: N,3,H,W in [-1, 1]
        x = self.features(x).mean((2, 3))
        return self.fc(self.drop(x))


class Export(nn.Module):
    """NHWC float 0-255 in, probabilities out: what the browser worker feeds and reads."""

    def __init__(self, net: Net) -> None:
        super().__init__()
        self.net = net

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x.permute(0, 3, 1, 2) / 127.5 - 1.0
        return F.softmax(self.net(x), dim=1)


def to_input(u8: torch.Tensor) -> torch.Tensor:
    return u8.permute(0, 3, 1, 2).float() / 127.5 - 1.0


def augment(x: torch.Tensor) -> torch.Tensor:
    n = x.shape[0]
    flip = torch.rand(n, device=x.device) < 0.5
    x = torch.where(flip[:, None, None, None], x.flip(3), x)
    ang = (torch.rand(n, device=x.device) - 0.5) * 0.25
    sc = 1.0 + (torch.rand(n, device=x.device) - 0.5) * 0.3
    theta = torch.zeros(n, 2, 3, device=x.device)
    theta[:, 0, 0], theta[:, 0, 1] = torch.cos(ang) / sc, -torch.sin(ang) / sc
    theta[:, 1, 0], theta[:, 1, 1] = torch.sin(ang) / sc, torch.cos(ang) / sc
    x = F.grid_sample(x, F.affine_grid(theta, x.shape, align_corners=False), padding_mode="reflection",
                      align_corners=False)
    b = (torch.rand(n, 1, 1, 1, device=x.device) - 0.5) * 0.4
    c = 1.0 + (torch.rand(n, 1, 1, 1, device=x.device) - 0.5) * 0.4
    return ((x * c) + b).clamp(-1, 1)


@torch.no_grad()
def predict(net: Net, imgs: torch.Tensor, dev: str) -> np.ndarray:
    net.eval()
    out = []
    for i in range(0, len(imgs), 256):
        with torch.autocast(dev, dtype=torch.float16, enabled=dev == "cuda"):
            out.append(net(to_input(imgs[i:i + 256].to(dev))).float().softmax(1).cpu())
    return torch.cat(out).numpy()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, default=Path("ml/data/datasets/archive-v2"))
    ap.add_argument("--out", type=Path, default=Path("ml/artifacts/archive-v2"))
    ap.add_argument("--head-epochs", type=int, default=3)
    ap.add_argument("--epochs", type=int, default=14)
    a = ap.parse_args()
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    meta = json.loads((a.data / "meta.json").read_text(encoding="utf-8"))
    names = meta["class_names"]
    imgs = torch.from_numpy(np.load(a.data / "images.npy"))
    y = torch.tensor(meta["labels"])
    split = np.array(meta["split"])
    idx = {s: torch.from_numpy(np.where(split == s)[0]) for s in ("train", "val", "test")}

    net = Net(len(names), True).to(dev)
    counts = torch.bincount(y[idx["train"]], minlength=len(names)).float()
    weight = (counts.sum() / (len(names) * counts)).to(dev)
    gx = imgs[idx["train"]]
    gy = y[idx["train"]]

    def run(epochs: int, lr: float, freeze: bool) -> float:
        for p in net.features.parameters():
            p.requires_grad = not freeze
        params = [p for p in net.parameters() if p.requires_grad]
        opt = torch.optim.AdamW(params, lr=lr, weight_decay=1e-4)
        steps = epochs * (len(gx) // 64)
        sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=lr, total_steps=steps)
        scaler = torch.amp.GradScaler(enabled=dev == "cuda")
        best = -1.0
        for ep in range(epochs):
            net.train()
            if freeze:
                net.features.eval()
            perm = torch.randperm(len(gx))
            for i in range(0, len(perm) - 63, 64):
                b = perm[i:i + 64]
                xb = augment(to_input(gx[b].to(dev)))
                with torch.autocast(dev, dtype=torch.float16, enabled=dev == "cuda"):
                    loss = F.cross_entropy(net(xb), gy[b].to(dev), weight=weight, label_smoothing=0.05)
                opt.zero_grad(set_to_none=True)
                scaler.scale(loss).backward()
                scaler.step(opt)
                scaler.update()
                sched.step()
            acc = float((predict(net, imgs[idx["val"]], dev).argmax(1) == y[idx["val"]].numpy()).mean())
            print(f"epoch {ep + 1}/{epochs} val acc {acc:.4f}", flush=True)
            if acc > best:
                best = acc
                torch.save(net.state_dict(), a.out / "best.pt")
        return best

    a.out.mkdir(parents=True, exist_ok=True)
    run(a.head_epochs, 1e-3, True)
    net.load_state_dict(torch.load(a.out / "best.pt"))
    run(a.epochs, 3e-4, False)
    net.load_state_dict(torch.load(a.out / "best.pt"))

    p = predict(net, imgs[idx["test"]], dev)
    pred, true = p.argmax(1), y[idx["test"]].numpy()
    rep = {}
    for i, n in enumerate(names):
        m = true == i
        tp = int(((pred == i) & m).sum())
        fp = int(((pred == i) & ~m).sum())
        rep[n] = {"n": int(m.sum()), "recall": round(tp / max(1, m.sum()), 4),
                  "precision": round(tp / max(1, tp + fp), 4)}
    f1 = np.mean([2 * r["precision"] * r["recall"] / max(1e-9, r["precision"] + r["recall"]) for r in rep.values()])
    metrics = {"test_accuracy": float((pred == true).mean()), "test_macro_f1": float(f1), "per_class": rep,
               "split_counts": {s: len(v) for s, v in idx.items()}, "classes": names,
               "note": "Hold-out photos from the same sources; not a field measure."}
    (a.out / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (a.out / "itapon-archive-v2.labels.json").write_text(json.dumps({
        "model_version": "itapon-archive-mobilenetv2-v2", "input_size": [192, 192],
        "input_format": "RGB float pixel values 0-255", "class_names": names}, indent=2), encoding="utf-8")
    print(json.dumps({"acc": metrics["test_accuracy"], "macro_f1": metrics["test_macro_f1"], "per_class": rep}, indent=1))

    net.cpu().eval()
    torch.onnx.export(Export(net).eval(), torch.zeros(1, 192, 192, 3), str(a.out / "itapon-archive-v2.onnx"),
                      input_names=["image_rgb_0_255"], output_names=["class_probabilities"],
                      dynamic_axes={"image_rgb_0_255": {0: "batch"}, "class_probabilities": {0: "batch"}},
                      opset_version=17, dynamo=False)
    print("exported", a.out / "itapon-archive-v2.onnx")


if __name__ == "__main__":
    main()
