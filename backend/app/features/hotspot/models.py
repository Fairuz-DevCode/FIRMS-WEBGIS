# ==============================================================================
# MODEL DATABASE TITIK API (HOTSPOTS)
# ==============================================================================
# Mendefinisikan skema tabel PostGIS untuk data kebakaran aktif NASA FIRMS.
# ==============================================================================

from sqlalchemy import Column, Integer, Float, String, Date
from geoalchemy2 import Geometry
from app.config.database import Base


class Hotspot(Base):
    __tablename__ = "hotspots"

    # BAGIAN 1: Primary key dan koordinat
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # BAGIAN 2: Atribut fisik kebakaran dari satelit
    brightness = Column(Float, nullable=True)  # Suhu kecerahan (Kelvin)
    acq_date = Column(Date, nullable=False, index=True)  # Tanggal deteksi
    acq_time = Column(String(10), nullable=True)  # Jam deteksi UTC
    confidence = Column(String(10), nullable=True, index=True)  # Tingkat keyakinan
    frp = Column(Float, nullable=True)  # Fire Radiative Power (MW)

    # BAGIAN 3: Geometri spasial Point SRID 4326 (WGS84)
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    # BAGIAN 4: Format serialisasi GeoJSON feature
    def to_geojson_feature(self) -> dict:
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(self.longitude), float(self.latitude)]
            },
            "properties": {
                "id": self.id,
                "latitude": float(self.latitude),
                "longitude": float(self.longitude),
                "brightness": float(self.brightness or 0.0),
                "acq_date": str(self.acq_date),
                "acq_time": self.acq_time or "0000",
                "confidence": self.confidence or "n/a",
                "frp": float(self.frp or 0.0)
            }
        }
