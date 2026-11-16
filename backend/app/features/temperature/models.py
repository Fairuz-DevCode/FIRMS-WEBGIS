# BAGIAN 1: Import library dan modul pendukung
from sqlalchemy import Column, Integer, Float, DateTime, Boolean
from geoalchemy2 import Geometry
from app.config.database import Base

# BAGIAN 2: Model ORM PostGIS untuk data suhu (temperature)
class Temperature(Base):
    __tablename__ = "temperature"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    waktu = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    suhu_celsius = Column(Float, nullable=True)
    is_indonesia = Column(Boolean, default=True, nullable=True)
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)

    # BAGIAN 3: Serialisasi format array koordinat dan nilai suhu
    def to_flat_array(self) -> list:
        return [
            float(self.longitude), 
            float(self.latitude), 
            float(self.suhu_celsius if self.suhu_celsius is not None else 0.0)
        ]
