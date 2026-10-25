import os
import sys
import time
import json
import io
import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://firms_user:firms_password@db:5432/firms_db")

def seed():
    print(f"[SEED] Connecting to database at {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)
    
    # 1. Check if database is ready
    for i in range(15):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1;"))
            print("[SEED] Database connected successfully.")
            break
        except Exception as e:
            print(f"[SEED] Waiting for database ({i+1}/15)...")
            time.sleep(2)

    # 2. Seed Peatlands
    peatland_candidates = [
        "data/raw data/Indonesia_Peat_Lands.geojson",
        "data/Indonesia_Peat_Lands.geojson",
        "/app/data/raw data/Indonesia_Peat_Lands.geojson",
        "/app/data/Indonesia_Peat_Lands.geojson"
    ]
    peatland_file = next((f for f in peatland_candidates if os.path.exists(f)), None)

    if peatland_file:
        try:
            with engine.connect() as conn:
                cnt = conn.execute(text("SELECT COUNT(*) FROM peatlands;")).scalar()
                if cnt == 0:
                    print(f"[SEED] Seeding peatlands from {peatland_file}...")
                    with open(peatland_file, "r") as f:
                        geojson = json.load(f)
                    
                    features = geojson.get("features", [])
                    print(f"[SEED] Inserting {len(features)} peatland polygons...")
                    for feat in features:
                        props = feat.get("properties", {})
                        geom_json = json.dumps(feat.get("geometry", {}))
                        obj_id = props.get("objectid")
                        layer_rev = props.get("layer_revi", "gambut")
                        shape_area = props.get("shape_Area")
                        conn.execute(
                            text("""
                                INSERT INTO peatlands (objectid, layer_revi, shape_area, geom)
                                VALUES (:obj_id, :layer_revi, :shape_area, ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326))
                            """),
                            {"obj_id": obj_id, "layer_revi": layer_rev, "shape_area": shape_area, "geom_json": geom_json}
                        )
                    conn.commit()
                    print("[SEED] Peatlands seeded successfully!")
                else:
                    print(f"[SEED] Peatlands already contains {cnt} records. Skipping.")
        except Exception as e:
            print(f"[SEED ERROR] Error seeding peatlands: {e}")

    # 3. Seed ERA5 (Temperature, Rainfall, Soil Moisture)
    era5_candidates = [
        "data/era5_clean_7_tahun.csv",
        "/app/data/era5_clean_7_tahun.csv"
    ]
    era5_file = next((f for f in era5_candidates if os.path.exists(f)), None)

    if era5_file:
        try:
            with engine.connect() as conn:
                temp_cnt = conn.execute(text("SELECT COUNT(*) FROM temperature;")).scalar()
                if temp_cnt == 0:
                    print(f"[SEED] Seeding ERA5 climate data from {era5_file}...")
                    raw_conn = engine.raw_connection()
                    cursor = raw_conn.cursor()

                    # Temporary staging table
                    cursor.execute("""
                        CREATE TEMP TABLE tmp_era5 (
                            valid_time TIMESTAMP,
                            latitude DOUBLE PRECISION,
                            longitude DOUBLE PRECISION,
                            t2m DOUBLE PRECISION,
                            swvl1 DOUBLE PRECISION,
                            tp DOUBLE PRECISION
                        ) ON COMMIT DROP;
                    """)

                    print("[SEED] Reading ERA5 dataset and preparing latest snapshot...")
                    df = pd.read_csv(era5_file)
                    latest_time = df['valid_time'].max()
                    df_latest = df[df['valid_time'] == latest_time]
                    print(f"[SEED] Fast bulk loading {len(df_latest)} records (timestamp: {latest_time})...")

                    buf = io.StringIO()
                    df_latest.to_csv(buf, index=False, header=False)
                    buf.seek(0)

                    cursor.copy_expert("COPY tmp_era5 FROM STDIN WITH (FORMAT csv)", buf)

                    # Bulk insert into temperature
                    cursor.execute("""
                        INSERT INTO temperature (waktu, latitude, longitude, suhu_celsius, geom)
                        SELECT valid_time, latitude, longitude, t2m, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                        FROM tmp_era5;
                    """)

                    # Bulk insert into rainfall_data
                    cursor.execute("""
                        INSERT INTO rainfall_data (waktu, latitude, longitude, curah_hujan_mm, geom)
                        SELECT valid_time, latitude, longitude, tp, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                        FROM tmp_era5;
                    """)

                    # Bulk insert into soil_moisture_data
                    cursor.execute("""
                        INSERT INTO soil_moisture_data (waktu, latitude, longitude, soil_moisture, geom)
                        SELECT valid_time, latitude, longitude, swvl1, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                        FROM tmp_era5;
                    """)

                    raw_conn.commit()
                    cursor.close()
                    raw_conn.close()
                    print("[SEED] ERA5 climate tables seeded successfully!")
                else:
                    print(f"[SEED] Temperature table already contains {temp_cnt} records. Skipping.")
        except Exception as e:
            print(f"[SEED ERROR] Error seeding ERA5 data: {e}")

if __name__ == "__main__":
    seed()
