import numpy as np
import pandas as pd
from tensorflow import keras
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import json

def create_sequences(data, seq_length=12):
    """
    Create sequences for LSTM training
    """
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i+seq_length])
        y.append(data[i+seq_length])
    return np.array(X), np.array(y)

def generate_training_data(species_list, n_months=120):
    """
    Generate synthetic time-series data for training
    """
    data = {}

    for species in species_list:
        baseline = np.random.randint(2000, 8000)
        trend = np.random.uniform(-0.01, 0.02)

        time_series = []
        for month in range(n_months):
            seasonal = baseline * (1 + 0.3 * np.sin(2 * np.pi * month / 12))
            trend_component = baseline * trend * month / 12
            noise = np.random.normal(0, baseline * 0.1)

            value = seasonal + trend_component + noise
            time_series.append(max(0, value))

        data[species] = time_series

    return data

def build_lstm_model(input_shape):
    """
    Build LSTM model architecture
    """
    model = Sequential([
        LSTM(64, activation='relu', return_sequences=True, input_shape=input_shape),
        Dropout(0.2),
        LSTM(32, activation='relu'),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(1)
    ])

    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    return model

def train_model(species_name, data, seq_length=12, epochs=100):
    """
    Train LSTM model for a specific species
    """
    # Normalize data
    data_normalized = (data - np.mean(data)) / np.std(data)

    # Create sequences
    X, y = create_sequences(data_normalized, seq_length)

    # Reshape for LSTM [samples, timesteps, features]
    X = X.reshape((X.shape[0], X.shape[1], 1))

    # Split train/test
    train_size = int(0.8 * len(X))
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]

    # Build and train model
    model = build_lstm_model((seq_length, 1))

    early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

    history = model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=32,
        validation_data=(X_test, y_test),
        callbacks=[early_stop],
        verbose=1
    )

    # Save model
    model.save(f'models/saved/lstm_{species_name.replace(" ", "_")}.h5')

    return model, history

if __name__ == "__main__":
    species_list = [
        'Sardinella longiceps',
        'Rastrelliger kanagurta',
        'Thunnus albacares',
        'Katsuwonus pelamis',
        'Scomberomorus guttatus',
    ]

    print("Generating training data...")
    training_data = generate_training_data(species_list)

    for species in species_list:
        print(f"\nTraining LSTM model for {species}...")
        data = np.array(training_data[species])

        model, history = train_model(species, data)

        # Print results
        final_loss = history.history['loss'][-1]
        final_val_loss = history.history['val_loss'][-1]

        print(f"Final training loss: {final_loss:.4f}")
        print(f"Final validation loss: {final_val_loss:.4f}")

    print("\nAll models trained successfully!")
