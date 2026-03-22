import numpy as np
from sklearn.linear_model import LinearRegression
from typing import List, Dict

class RegressionPredictor:
    def __init__(self):
        self.model = LinearRegression()
        self._initialize_model()

    def _initialize_model(self):
        """
        Initialize regression model with synthetic training data
        Predicts fish abundance based on environmental parameters
        """
        np.random.seed(42)
        n_samples = 500

        # Features: temperature, salinity, ph, oxygen
        X_train = np.column_stack([
            np.random.uniform(24, 32, n_samples),
            np.random.uniform(32, 37, n_samples),
            np.random.uniform(7.8, 8.3, n_samples),
            np.random.uniform(4.5, 8.5, n_samples),
        ])

        # Target: abundance (simulated relationship)
        y_train = []
        for temp, sal, ph, oxy in X_train:
            # Optimal conditions: temp=28, sal=34.5, ph=8.1, oxy=7.0
            temp_score = 1 - abs(temp - 28) / 10
            sal_score = 1 - abs(sal - 34.5) / 5
            ph_score = 1 - abs(ph - 8.1) / 0.5
            oxy_score = 1 - abs(oxy - 7.0) / 4

            base_abundance = 5000
            abundance = base_abundance * (temp_score + sal_score + ph_score + oxy_score) / 4
            abundance += np.random.normal(0, 500)  # Add noise

            y_train.append(max(0, abundance))

        self.model.fit(X_train, y_train)

    def predict(self, data: List[Dict]) -> List[Dict]:
        """
        Predict abundance for given environmental conditions
        """
        features = []
        for item in data:
            features.append([
                item.get('temperature', 28),
                item.get('salinity', 34.5),
                item.get('ph', 8.1),
                item.get('oxygen', 7.0),
            ])

        X = np.array(features)
        predictions = self.model.predict(X)

        results = []
        for i, pred in enumerate(predictions):
            results.append({
                'input': data[i],
                'predicted_abundance': max(0, float(pred)),
            })

        return results

    def train(self, X_train, y_train):
        """
        Train linear regression model
        """
        self.model.fit(X_train, y_train)
        return self.model

    def get_coefficients(self):
        """
        Get model coefficients
        """
        return {
            'temperature': float(self.model.coef_[0]),
            'salinity': float(self.model.coef_[1]),
            'ph': float(self.model.coef_[2]),
            'oxygen': float(self.model.coef_[3]),
            'intercept': float(self.model.intercept_),
        }

    def calculate_environmental_impact(self, baseline: Dict, changes: Dict) -> Dict:
        """
        Calculate impact of environmental changes on abundance
        """
        baseline_features = np.array([[
            baseline.get('temperature', 28),
            baseline.get('salinity', 34.5),
            baseline.get('ph', 8.1),
            baseline.get('oxygen', 7.0),
        ]])

        changed_features = np.array([[
            baseline.get('temperature', 28) + changes.get('temperature', 0),
            baseline.get('salinity', 34.5) + changes.get('salinity', 0),
            baseline.get('ph', 8.1) + changes.get('ph', 0),
            baseline.get('oxygen', 7.0) + changes.get('oxygen', 0),
        ]])

        baseline_pred = self.model.predict(baseline_features)[0]
        changed_pred = self.model.predict(changed_features)[0]

        impact = ((changed_pred - baseline_pred) / baseline_pred) * 100

        return {
            'baseline_abundance': float(baseline_pred),
            'projected_abundance': float(changed_pred),
            'percent_change': float(impact),
            'interpretation': 'positive' if impact > 0 else 'negative' if impact < 0 else 'neutral',
        }
