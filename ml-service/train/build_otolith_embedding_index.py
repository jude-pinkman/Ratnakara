from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image


@dataclass
class ImageSample:
    path: str
    label: str


def normalize_species_id(raw: str) -> str:
    return "_".join(raw.lower().strip().replace("-", " ").split())


def parse_dataset(dataset_dir: Path) -> list[ImageSample]:
    samples: list[ImageSample] = []
    for path in sorted(dataset_dir.glob("*")):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        stem = path.stem
        species_part = stem.split("_", 1)[1] if "_" in stem and stem.split("_", 1)[0].isdigit() else stem
        label = normalize_species_id(species_part)
        samples.append(ImageSample(path=str(path), label=label))

    if not samples:
        raise ValueError(f"No images found in {dataset_dir}")
    return samples


def load_embedding_model(image_size: tuple[int, int]) -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV2(
        input_shape=(image_size[0], image_size[1], 3),
        include_top=False,
        weights="imagenet",
        pooling="avg",
    )
    base.trainable = False
    return base


def preprocess_image(path: str, image_size: tuple[int, int]) -> np.ndarray:
    image = Image.open(path).convert("RGB")
    image = image.resize(image_size)
    arr = np.asarray(image, dtype=np.float32)
    arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr)
    return np.expand_dims(arr, axis=0)


def l2_normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.maximum(norms, 1e-12)
    return vectors / norms


def main(args: argparse.Namespace) -> None:
    samples = parse_dataset(args.dataset_dir)
    model = load_embedding_model(args.image_size)

    labels: list[str] = []
    paths: list[str] = []
    embeddings: list[np.ndarray] = []

    for sample in samples:
        batch = preprocess_image(sample.path, args.image_size)
        emb = model(batch, training=False).numpy()[0]
        embeddings.append(emb.astype(np.float32))
        labels.append(sample.label)
        paths.append(sample.path)

    emb_matrix = np.stack(embeddings)
    emb_matrix = l2_normalize(emb_matrix)

    args.index_output.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        args.index_output,
        embeddings=emb_matrix,
        labels=np.array(labels, dtype=object),
        image_paths=np.array(paths, dtype=object),
    )

    meta = {
        "num_samples": len(labels),
        "num_unique_species": len(sorted(set(labels))),
        "embedding_dim": int(emb_matrix.shape[1]),
        "image_size": list(args.image_size),
        "backbone": "MobileNetV2",
    }
    args.meta_output.parent.mkdir(parents=True, exist_ok=True)
    args.meta_output.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"Saved embedding index: {args.index_output}")
    print(f"Saved metadata: {args.meta_output}")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Build one-shot otolith embedding index")
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=repo_root / "Taxonomyformatter" / "otolith_dataset",
    )
    parser.add_argument(
        "--index-output",
        type=Path,
        default=repo_root / "ml-service" / "models" / "otolith_embedding_index.npz",
    )
    parser.add_argument(
        "--meta-output",
        type=Path,
        default=repo_root / "ml-service" / "models" / "otolith_embedding_meta.json",
    )
    parser.add_argument("--image-size", type=int, nargs=2, default=(224, 224))
    main(parser.parse_args())
