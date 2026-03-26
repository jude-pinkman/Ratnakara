from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
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
    image = tf.io.decode_image(image, channels=3, expand_animations=False)
    image.set_shape([None, None, 3])
    image = tf.image.resize(image, image_size)
    image = tf.keras.applications.mobilenet_v2.preprocess_input(image)
    return image, label


def build_model(num_classes: int, image_size: tuple[int, int], dropout: float) -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV2(
        input_shape=(image_size[0], image_size[1], 3),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = False

    augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip(mode="horizontal"),
            tf.keras.layers.RandomRotation(0.06),
            tf.keras.layers.RandomZoom(0.12),
            tf.keras.layers.RandomContrast(0.12),
        ],
        name="augmentation",
    )

    inputs = tf.keras.Input(shape=(image_size[0], image_size[1], 3))
    x = augmentation(inputs)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(dropout)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    return model


def compile_model(model: tf.keras.Model, learning_rate: float, label_smoothing: float) -> None:
    # Older TF/Keras builds (common on Windows) may not expose label_smoothing
    # on SparseCategoricalCrossentropy; fall back to plain sparse CE.
    try:
        loss = tf.keras.losses.SparseCategoricalCrossentropy(label_smoothing=label_smoothing)
    except TypeError:
        loss = tf.keras.losses.SparseCategoricalCrossentropy()

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss=loss,
        metrics=["accuracy"],
    )


def set_finetune_layers(model: tf.keras.Model, unfreeze_last_n: int) -> None:
    backbone = model.get_layer(index=2)
    if not isinstance(backbone, tf.keras.Model):
        raise RuntimeError("Unexpected backbone layout in model")

    backbone.trainable = True
    if unfreeze_last_n <= 0:
        for layer in backbone.layers:
            layer.trainable = False
        return

    cutoff = max(0, len(backbone.layers) - unfreeze_last_n)
    for i, layer in enumerate(backbone.layers):
        layer.trainable = i >= cutoff


def make_callbacks(model_path: Path) -> list[tf.keras.callbacks.Callback]:
    return [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=6, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.4, patience=2, min_lr=1e-7),
        tf.keras.callbacks.ModelCheckpoint(filepath=str(model_path), monitor="val_accuracy", save_best_only=True),
    ]


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

    classes = np.unique(train_y)
    class_weights_arr = compute_class_weight(class_weight="balanced", classes=classes, y=train_y)
    class_weights = {i: 1.0 for i in range(len(labels))}
    class_weights.update({int(c): float(w) for c, w in zip(classes, class_weights_arr)})

    model = build_model(num_classes=len(labels), image_size=args.image_size, dropout=args.dropout)
    callbacks = make_callbacks(args.model_path)

    compile_model(model, learning_rate=args.head_lr, label_smoothing=args.label_smoothing)
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.head_epochs,
        callbacks=callbacks,
        class_weight=class_weights,
    )

    set_finetune_layers(model, args.unfreeze_last_n)
    compile_model(model, learning_rate=args.finetune_lr, label_smoothing=args.label_smoothing)
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.head_epochs + args.finetune_epochs,
        initial_epoch=args.head_epochs,
        callbacks=callbacks,
        class_weight=class_weights,
    )

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
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--val-split", type=float, default=0.2)
    parser.add_argument("--image-size", type=int, nargs=2, default=(224, 224))
    parser.add_argument("--head-epochs", type=int, default=12)
    parser.add_argument("--finetune-epochs", type=int, default=10)
    parser.add_argument("--head-lr", type=float, default=1e-3)
    parser.add_argument("--finetune-lr", type=float, default=1e-5)
    parser.add_argument("--unfreeze-last-n", type=int, default=40)
    parser.add_argument("--dropout", type=float, default=0.4)
    parser.add_argument("--label-smoothing", type=float, default=0.05)

    parsed = parser.parse_args()
    main(parsed)
