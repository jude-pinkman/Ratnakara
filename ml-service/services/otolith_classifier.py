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
        self.softmax_available = False
        self.embedding_model: tf.keras.Model | None = None
        self.index_embeddings: np.ndarray | None = None
        self.index_labels: np.ndarray | None = None
        self.embedding_available = False
        self.loaded = False
        self.mode = "unavailable"

        if self.model_path.exists() and self.labels_path.exists():
            self.model = tf.keras.models.load_model(self.model_path)
            self.labels = json.loads(self.labels_path.read_text(encoding="utf-8"))
            self.softmax_available = True

        if self.embedding_index_path is not None and self.embedding_index_path.exists():
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
            self.embedding_available = True

        self.loaded = self.softmax_available or self.embedding_available
        if self.softmax_available and self.embedding_available:
            self.mode = "hybrid"
        elif self.softmax_available:
            self.mode = "softmax"
        elif self.embedding_available:
            self.mode = "embedding_knn"

    def _preprocess(self, image_bytes: bytes) -> np.ndarray:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize(self.image_size)
        arr = np.asarray(image, dtype=np.float32)
        arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr)
        return np.expand_dims(arr, axis=0)

    def _predict_softmax_with_tta(self, batch: np.ndarray) -> tuple[str, float] | None:
        if not self.softmax_available or self.model is None or not self.labels:
            return None

        flipped = np.flip(batch, axis=2)
        probs = self.model.predict(batch, verbose=0)[0]
        probs_flip = self.model.predict(flipped, verbose=0)[0]
        probs = (probs + probs_flip) / 2.0

        index = int(np.argmax(probs))
        species = self.labels[index]
        confidence = float(np.max(probs))
        return species, confidence

    def _predict_embedding_with_tta(self, batch: np.ndarray) -> tuple[str, float] | None:
        if (
            not self.embedding_available
            or self.embedding_model is None
            or self.index_embeddings is None
            or self.index_labels is None
        ):
            return None

        flipped = np.flip(batch, axis=2)
        query_a = self.embedding_model.predict(batch, verbose=0).astype(np.float32)
        query_b = self.embedding_model.predict(flipped, verbose=0).astype(np.float32)
        query = (query_a + query_b) / 2.0
        query = query / np.maximum(np.linalg.norm(query, axis=1, keepdims=True), 1e-12)

        sims = np.dot(self.index_embeddings, query[0])
        best_idx = int(np.argmax(sims))
        best_sim = float(sims[best_idx])

        if len(sims) > 1:
            second_sim = float(np.partition(sims, -2)[-2])
        else:
            second_sim = -1.0

        species = str(self.index_labels[best_idx])
        base_conf = max(0.0, min(1.0, (best_sim + 1.0) / 2.0))
        margin = max(0.0, best_sim - second_sim)
        margin_bonus = max(0.0, min(1.0, margin * 4.0))
        confidence = float(max(0.0, min(1.0, 0.6 * base_conf + 0.4 * margin_bonus)))
        return species, confidence

    def predict(self, image_bytes: bytes) -> dict[str, float | str]:
        if not self.loaded:
            raise RuntimeError("Otolith model artifacts are not available")

        batch = self._preprocess(image_bytes)
        softmax_pred = self._predict_softmax_with_tta(batch)
        embedding_pred = self._predict_embedding_with_tta(batch)

        if softmax_pred is None and embedding_pred is None:
            raise RuntimeError("Otolith model artifacts are not available")

        if softmax_pred is None and embedding_pred is not None:
            species, confidence = embedding_pred
            return {
                "species": species,
                "confidence": confidence,
            }

        if embedding_pred is None and softmax_pred is not None:
            species, confidence = softmax_pred
            return {
                "species": species,
                "confidence": confidence,
            }

        assert softmax_pred is not None and embedding_pred is not None
        softmax_species, softmax_conf = softmax_pred
        embedding_species, embedding_conf = embedding_pred

        if softmax_species == embedding_species:
            confidence = float(max(softmax_conf, embedding_conf))
            return {
                "species": softmax_species,
                "confidence": confidence,
            }

        if embedding_conf > softmax_conf:
            return {
                "species": embedding_species,
                "confidence": float(embedding_conf),
            }

        return {
            "species": softmax_species,
            "confidence": float(softmax_conf),
        }

        raise RuntimeError("Otolith model artifacts are not available")
