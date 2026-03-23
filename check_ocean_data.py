#!/usr/bin/env python3
"""Debug script to check ocean data in database"""
import os
import sys
from dotenv import load_dotenv
import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

load_dotenv("marine-pipeline-service/.env")
db_url = os.getenv("DATABASE_URL")

print(f"Database: {db_url[:50]}...")

# Connect and check ocean_data
engine = create_engine(db_url, connect_args={"sslmode": "require"})

with Session(engine) as session:
    # Check total records
    result = session.execute(text("SELECT COUNT(*) as count FROM ocean_data"))
    total = result.scalar()
    print(f"\nTotal ocean_data records: {total}")
    
    # Check sample records with all fields
    print("\nSample ocean_data records:")
    result = session.execute(text("""
        SELECT id, station_id, latitude, longitude, temperature, 
               salinity, wave_height, wind_speed, recorded_at
        FROM ocean_data
        ORDER BY recorded_at DESC
        LIMIT 5
    """))
    
    for row in result:
        print(f"  ID: {row[0]}, Station: {row[1]}, Lat: {row[2]}, Lon: {row[3]}")
        print(f"    Temp: {row[4]}, Salinity: {row[5]}, Wave: {row[6]}, Wind: {row[7]}")
        print(f"    Time: {row[8]}")
    
    # Check for NULL temperatures
    result = session.execute(text("""
        SELECT COUNT(*) as null_temps FROM ocean_data WHERE temperature IS NULL
    """))
    null_count = result.scalar()
    print(f"\nRecords with NULL temperature: {null_count}")
    
    # Check temperature range
    result = session.execute(text("""
        SELECT MIN(temperature), MAX(temperature), AVG(temperature) 
        FROM ocean_data WHERE temperature IS NOT NULL
    """))
    min_t, max_t, avg_t = result.fetchone()
    print(f"Temperature range: {min_t} to {max_t} (avg: {avg_t})")
