# BAGIAN 1: Import library dan modul pendukung
from sqlalchemy import Column, Integer, Float, String
from geoalchemy2 import Geometry
from app.config.database import Base

# BAGIAN 2: Model ORM PostGIS untuk polygon lahan gambut (peatlands)
class Peatland(Base):
    __tablename__ = "peatlands"

    ogc_fid = Column(Integer, primary_key=True, index=True, autoincrement=True)
    objectid = Column(Integer, nullable=True)
    layer_revi = Column(String, nullable=True)
    shape_area = Column("shape_area", Float, nullable=True)
    geom = Column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=True)
