import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import List

class RandomForestPredictor:
    def __init__(self):
        # Initialize with a simple trained model (simulated)
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self._initialize_model()

    def _initialize_model(self):
        """
        Initialize model with synthetic training data
        In production, load pre-trained model from file
        """
        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 1000

        # Features: temperature, salinity, ph, oxygen
        X_train = np.column_stack([
            np.random.uniform(24, 32, n_samples),  # temperature
            np.random.uniform(32, 37, n_samples),  # salinity
            np.random.uniform(7.8, 8.3, n_samples),  # pH
            np.random.uniform(4.5, 8.5, n_samples),  # oxygen
        ])

        # Target: abundance category (0=low, 1=medium, 2=high)
        y_train = []
        for temp, sal, ph, oxy in X_train:
            # Simple rule-based categorization for simulation
            score = 0
            if 26 <= temp <= 30:
                score += 1
            if 33 <= sal <= 36:
                score += 1
            if 7.9 <= ph <= 8.2:
                score += 1
            if 5.5 <= oxy <= 8.0:
                score += 1

            if score >= 3:
                category = 2  # high
            elif score >= 2:
                category = 1  # medium
            else:
                category = 0  # low

            y_train.append(category)

        self.model.fit(X_train, y_train)

    def predict(self, features: np.ndarray) -> List[str]:
        """
        Predict abundance category based on environmental features
        """
        predictions = self.model.predict(features)

        category_map = {0: 'low', 1: 'medium', 2: 'high'}
        return [category_map[p] for p in predictions]

    def train(self, X_train, y_train):
        """
        Train Random Forest model
        """
        self.model.fit(X_train, y_train)
        return self.model

    def get_feature_importance(self):
        """
        Get feature importance scores
        """
        return {
            'temperature': float(self.model.feature_importances_[0]),
            'salinity': float(self.model.feature_importances_[1]),
            'ph': float(self.model.feature_importances_[2]),
            'oxygen': float(self.model.feature_importances_[3]),
        }
