import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib

def generate_training_data(n_samples=3000):
    """
    Generate synthetic training data for abundance regression
    """
    np.random.seed(42)

    # Features: temperature, salinity, pH, oxygen
    temperature = np.random.uniform(24, 32, n_samples)
    salinity = np.random.uniform(32, 37, n_samples)
    ph = np.random.uniform(7.8, 8.3, n_samples)
    oxygen = np.random.uniform(4.5, 8.5, n_samples)

    X = np.column_stack([temperature, salinity, ph, oxygen])

    # Generate abundance with realistic relationships
    y = []
    for temp, sal, ph_val, oxy in X:
        # Optimal conditions yield higher abundance
        temp_factor = 1 - abs(temp - 28) / 10  # Optimal at 28°C
        sal_factor = 1 - abs(sal - 34.5) / 5   # Optimal at 34.5 PSU
        ph_factor = 1 - abs(ph_val - 8.1) / 0.5  # Optimal at 8.1
        oxy_factor = 1 - abs(oxy - 7.0) / 4    # Optimal at 7.0 mg/L

        base_abundance = 5000
        abundance = base_abundance * (
            0.4 * temp_factor +
            0.25 * sal_factor +
            0.2 * ph_factor +
            0.15 * oxy_factor
        )

        # Add noise
        abundance += np.random.normal(0, 500)

        y.append(max(0, abundance))

    return X, np.array(y)

def train_linear_regression(X, y):
    """
    Train Linear Regression model
    """
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train model
    print("Training Linear Regression model...")
    model = LinearRegression()
    model.fit(X_train, y_train)

    # Predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)

    # Evaluation
    train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))

    train_r2 = r2_score(y_train, y_train_pred)
    test_r2 = r2_score(y_test, y_test_pred)

    train_mae = mean_absolute_error(y_train, y_train_pred)
    test_mae = mean_absolute_error(y_test, y_test_pred)

    print(f"\nTraining Metrics:")
    print(f"  RMSE: {train_rmse:.2f}")
    print(f"  R² Score: {train_r2:.4f}")
    print(f"  MAE: {train_mae:.2f}")

    print(f"\nTesting Metrics:")
    print(f"  RMSE: {test_rmse:.2f}")
    print(f"  R² Score: {test_r2:.4f}")
    print(f"  MAE: {test_mae:.2f}")

    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
    print(f"\nCross-validation R² scores: {cv_scores}")
    print(f"Mean CV R² score: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")

    # Model coefficients
    feature_names = ['Temperature', 'Salinity', 'pH', 'Oxygen']
    coefficients = model.coef_

    print("\nModel Coefficients:")
    for name, coef in zip(feature_names, coefficients):
        print(f"{name}: {coef:.2f}")
    print(f"Intercept: {model.intercept_:.2f}")

    return model

def train_ridge_regression(X, y, alpha=1.0):
    """
    Train Ridge Regression model (L2 regularization)
    """
    print(f"\nTraining Ridge Regression (alpha={alpha})...")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = Ridge(alpha=alpha)
    model.fit(X_train, y_train)

    y_test_pred = model.predict(X_test)
    test_r2 = r2_score(y_test, y_test_pred)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))

    print(f"Testing R² Score: {test_r2:.4f}")
    print(f"Testing RMSE: {test_rmse:.2f}")

    return model

def compare_models(X, y):
    """
    Compare different regression models
    """
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    models = {
        'Linear Regression': LinearRegression(),
        'Ridge (alpha=0.1)': Ridge(alpha=0.1),
        'Ridge (alpha=1.0)': Ridge(alpha=1.0),
        'Lasso (alpha=0.1)': Lasso(alpha=0.1),
    }

    print("\nModel Comparison:")
    print("-" * 60)

    results = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        r2 = r2_score(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))

        results[name] = {'r2': r2, 'rmse': rmse}

        print(f"{name:25} | R²: {r2:.4f} | RMSE: {rmse:.2f}")

    return results

if __name__ == "__main__":
    print("Generating training data...")
    X, y = generate_training_data(n_samples=3000)

    print(f"Dataset size: {len(X)} samples")
    print(f"Abundance range: {y.min():.0f} - {y.max():.0f}")
    print(f"Mean abundance: {y.mean():.0f}")

    # Train primary model
    model = train_linear_regression(X, y)

    # Compare models
    compare_models(X, y)

    # Save model
    print("\nSaving model...")
    joblib.dump(model, 'models/saved/linear_regression.pkl')

    print("\nModel training complete!")
