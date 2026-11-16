# ==============================================================================
# MODEL DATABASE CURAH HUJAN (RAINFALL)
# ==============================================================================
# Skema tabel PostGIS untuk data curah hujan harian (ERA5 dan Open-Meteo).
# ==============================================================================

from sqlalchemy import Column, Integer, Float, DateTime, Boolean
from geoalchemy2 import Geometry
from app.config.database import Base


class Rainfall(Base):
    __tablename__ = "rainfall_data"

    # BAGIAN 1: Primary key, waktu, dan koordinat
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    waktu = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # BAGIAN 2: Nilai curah hujan dan filter daratan
    curah_hujan_mm = Column(Float, nullable=True)
    is_indonesia = Column(Boolean, default=True, nullable=True)

    # BAGIAN 3: Geometri spasial Point SRID 4326
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    # BAGIAN 4: Format array datar [lon, lat, curah_hujan]
    def to_flat_array(self) -> list:
        return [
            float(self.longitude), 
            float(self.latitude), 
            float(self.curah_hujan_mm if self.curah_hujan_mm is not None else 0.0)
        ]
