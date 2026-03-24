from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from collections import Counter


@dataclass
class ImageSample:
    path: str
    label: str


def normalize_species_id(raw: str) -> str:
    return "_".join(raw.lower().strip().replace("-", " ").split())


def parse_dataset(dataset_dir: Path) -> tuple[list[ImageSample], list[str]]:
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

    labels = sorted(list({s.label for s in samples}))
    return samples, labels


def load_and_preprocess(path: tf.Tensor, label: tf.Tensor, image_size: tuple[int, int]):
    image = tf.io.read_file(path)
    image = tf.io.decode_jpeg(image, channels=3)
    image = tf.image.resize(image, image_size)
    image = tf.keras.applications.mobilenet_v2.preprocess_input(image)
    return image, label


def build_model(num_classes: int, image_size: tuple[int, int]) -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV2(
        input_shape=(image_size[0], image_size[1], 3),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = False

    inputs = tf.keras.Input(shape=(image_size[0], image_size[1], 3))
    x = base(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main(args: argparse.Namespace) -> None:
    samples, labels = parse_dataset(args.dataset_dir)
    label_to_idx = {label: idx for idx, label in enumerate(labels)}

    paths = np.array([s.path for s in samples])
    y = np.array([label_to_idx[s.label] for s in samples])

    class_counts = Counter(y.tolist())
    allow_stratify = min(class_counts.values()) >= 2
    stratify_labels = y if allow_stratify else None

    val_size = max(1, int(len(paths) * args.val_split))
    if val_size >= len(paths):
        val_size = max(1, len(paths) - 1)

    train_paths, val_paths, train_y, val_y = train_test_split(
        paths,
        y,
        test_size=val_size,
        random_state=42,
        stratify=stratify_labels,
    )

    train_ds = tf.data.Dataset.from_tensor_slices((train_paths, train_y))
    val_ds = tf.data.Dataset.from_tensor_slices((val_paths, val_y))

    train_ds = (
        train_ds
        .shuffle(buffer_size=len(train_paths))
        .map(lambda p, l: load_and_preprocess(p, l, args.image_size), num_parallel_calls=tf.data.AUTOTUNE)
        .batch(args.batch_size)
        .prefetch(tf.data.AUTOTUNE)
    )
    val_ds = (
        val_ds
        .map(lambda p, l: load_and_preprocess(p, l, args.image_size), num_parallel_calls=tf.data.AUTOTUNE)
        .batch(args.batch_size)
        .prefetch(tf.data.AUTOTUNE)
    )

    model = build_model(num_classes=len(labels), image_size=args.image_size)
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        tf.keras.callbacks.ModelCheckpoint(filepath=str(args.model_path), monitor="val_accuracy", save_best_only=True),
    ]

    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)

    args.labels_path.parent.mkdir(parents=True, exist_ok=True)
    args.labels_path.write_text(json.dumps(labels, indent=2), encoding="utf-8")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Train otolith image classifier")
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=repo_root / "Taxonomyformatter" / "otolith_dataset",
    )
    parser.add_argument(
        "--model-path",
        type=Path,
        default=repo_root / "ml-service" / "models" / "otolith_model.h5",
    )
    parser.add_argument(
        "--labels-path",
        type=Path,
        default=repo_root / "ml-service" / "models" / "otolith_labels.json",
    )
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--val-split", type=float, default=0.2)
    parser.add_argument("--image-size", type=int, nargs=2, default=(224, 224))

    parsed = parser.parse_args()
    main(parsed)
