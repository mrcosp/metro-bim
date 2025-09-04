# models.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PhotoUpload(BaseModel):
    obra_id: str
    timestamp: datetime
    latitude: float
    longitude: float
    local_na_obra: str

class AnalysisResult(BaseModel):
    foto_id: str
    obra_id: str
    porcentagem_conclusao: float
    elementos_identificados: list[str]
    elementos_previstos: list[str]
    discrepancias: list[str]
    view_bim_url: Optional[str] = None