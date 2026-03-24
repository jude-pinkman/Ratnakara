from __future__ import annotations

import io
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image


class OtolithClassifier:
    def __init__(
        self,
        model_path: Path,
        labels_path: Path,
        embedding_index_path: Path | None = None,
        image_size: tuple[int, int] = (224, 224),
    ) -> None:
        self.model_path = model_path
        self.labels_path = labels_path
        self.embedding_index_path = embedding_index_path
        self.image_size = image_size
        self.model: tf.keras.Model | None = None
        self.labels: list[str] = []
        self.embedding_model: tf.keras.Model | None = None
        self.index_embeddings: np.ndarray | None = None
        self.index_labels: np.ndarray | None = None
        self.loaded = False
        self.mode = "unavailable"

        if self.model_path.exists() and self.labels_path.exists():
            self.model = tf.keras.models.load_model(self.model_path)
            self.labels = json.loads(self.labels_path.read_text(encoding="utf-8"))
            self.loaded = True
            self.mode = "softmax"
        elif self.embedding_index_path is not None and self.embedding_index_path.exists():
            data = np.load(self.embedding_index_path, allow_pickle=True)
            self.index_embeddings = data["embeddings"].astype(np.float32)
            self.index_labels = data["labels"]
            self.embedding_model = tf.keras.applications.MobileNetV2(
                input_shape=(self.image_size[0], self.image_size[1], 3),
                include_top=False,
                weights="imagenet",
                pooling="avg",
            )
            self.embedding_model.trainable = False
            self.loaded = True
            self.mode = "embedding_knn"

    def _preprocess(self, image_bytes: bytes) -> np.ndarray:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize(self.image_size)
        arr = np.asarray(image, dtype=np.float32)
        arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr)
        return np.expand_dims(arr, axis=0)

    def predict(self, image_bytes: bytes) -> dict[str, float | str]:
        if not self.loaded:
            raise RuntimeError("Otolith model artifacts are not available")

        if self.mode == "softmax" and self.model is not None and self.labels:
            batch = self._preprocess(image_bytes)
            probs = self.model.predict(batch, verbose=0)[0]
            index = int(np.argmax(probs))
            species = self.labels[index]
            confidence = float(probs[index])
            return {
                "species": species,
                "confidence": confidence,
            }

        if (
            self.mode == "embedding_knn"
            and self.embedding_model is not None
            and self.index_embeddings is not None
            and self.index_labels is not None
        ):
            batch = self._preprocess(image_bytes)
            query = self.embedding_model.predict(batch, verbose=0).astype(np.float32)
            query = query / np.maximum(np.linalg.norm(query, axis=1, keepdims=True), 1e-12)
            sims = np.dot(self.index_embeddings, query[0])
            best_idx = int(np.argmax(sims))
            species = str(self.index_labels[best_idx])
            confidence = float(max(0.0, min(1.0, (sims[best_idx] + 1.0) / 2.0)))
            return {
                "species": species,
                "confidence": confidence,
            }

        raise RuntimeError("Otolith model artifacts are not available")
