import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import joblib

def generate_training_data(n_samples=5000):
    """
    Generate synthetic training data for fish abundance classification
    """
    np.random.seed(42)

    # Features: temperature, salinity, pH, oxygen
    temperature = np.random.uniform(24, 32, n_samples)
    salinity = np.random.uniform(32, 37, n_samples)
    ph = np.random.uniform(7.8, 8.3, n_samples)
    oxygen = np.random.uniform(4.5, 8.5, n_samples)

    X = np.column_stack([temperature, salinity, ph, oxygen])

    # Generate labels based on environmental conditions
    y = []
    for temp, sal, ph_val, oxy in X:
        score = 0

        # Optimal ranges
        if 26 <= temp <= 30:
            score += 2
        elif 24 <= temp <= 26 or 30 <= temp <= 32:
            score += 1

        if 33 <= sal <= 36:
            score += 2
        elif 32 <= sal <= 33 or 36 <= sal <= 37:
            score += 1

        if 7.9 <= ph_val <= 8.2:
            score += 2
        elif 7.8 <= ph_val <= 7.9 or 8.2 <= ph_val <= 8.3:
            score += 1

        if 5.5 <= oxy <= 8.0:
            score += 2
        elif 4.5 <= oxy <= 5.5:
            score += 1

        # Classify based on score
        if score >= 6:
            category = 2  # high abundance
        elif score >= 3:
            category = 1  # medium abundance
        else:
            category = 0  # low abundance

        y.append(category)

    return X, np.array(y)

def train_random_forest(X, y, n_estimators=200):
    """
    Train Random Forest classifier
    """
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train model
    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    # Evaluate
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)

    print(f"Training accuracy: {train_score:.4f}")
    print(f"Testing accuracy: {test_score:.4f}")

    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5)
    print(f"Cross-validation scores: {cv_scores}")
    print(f"Mean CV score: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")

    # Feature importance
    feature_names = ['Temperature', 'Salinity', 'pH', 'Oxygen']
    importances = model.feature_importances_

    print("\nFeature Importance:")
    for name, importance in zip(feature_names, importances):
        print(f"{name}: {importance:.4f}")

    # Predictions on test set
    y_pred = model.predict(X_test)

    labels = [0, 1, 2]
    class_names = ['Low', 'Medium', 'High']

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            y_pred,
            labels=labels,
            target_names=class_names,
            zero_division=0,
        )
    )

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred, labels=labels))

    return model

if __name__ == "__main__":
    print("Generating training data...")
    X, y = generate_training_data(n_samples=5000)

    print(f"Dataset size: {len(X)} samples")
    print(f"Class distribution: {np.bincount(y)}")

    model = train_random_forest(X, y)

    # Save model
    print("\nSaving model...")
    joblib.dump(model, 'models/saved/random_forest.pkl')

    print("Model training complete!")
