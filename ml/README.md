# ml/

Training workspace for the iTapon YOLO detector (roadmap Phases 3–7).

| Folder | Contents |
|---|---|
| `configs/` | `data.yaml`, training hyperparameters |
| `notebooks/` | EDA, training, evaluation notebooks (Colab / Kaggle) |
| `scripts/` | split, convert, export, evaluate |
| `data/` | dataset **manifests** only. Raw images live on Roboflow / HF Datasets (git-ignored) |

Weights (`*.pt`, `*.onnx`) are published to the Hugging Face model repo `itapon-yolo`, never committed.
