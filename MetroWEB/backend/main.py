# main.py
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form 
from fastapi.staticfiles import StaticFiles
from models import PhotoUpload, AnalysisResult
from mock_data import gerar_analise_mock
from services.ia_service import processar_imagem_real
import uuid
from typing import Dict, Any

app = FastAPI(title="Sistema de Monitoramento de Obras")

# Servir arquivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")

# Banco de dados em memória
fake_database: Dict[str, Dict[str, Any]] = {}

@app.post("/api/upload", 
          response_model=AnalysisResult,
          summary="Upload de foto do canteiro de obras",
          description="""
          Este endpoint recebe uma foto tirada no canteiro de obras junto com seus metadados.
          O sistema processa a imagem e retorna uma análise comparativa com o projeto BIM.
          """)
async def receber_upload(
    # Campos individuais como formulário
    obra_id: str = Form(...),
    timestamp: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    local_na_obra: str = Form(...),
    # Arquivo de imagem
    file: UploadFile = File(...)
):
    """Endpoint que recebe a foto e seus metadados."""
    
    # Criar objeto PhotoUpload com os dados do formulário
    foto_data = PhotoUpload(
        obra_id=obra_id,
        timestamp=datetime.fromisoformat(timestamp),
        latitude=latitude,
        longitude=longitude,
        local_na_obra=local_na_obra
    )

    # 1. Salvar a imagem em disco
    file_location = f"static/uploads/{file.filename}"
    with open(file_location, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # 2. (Por enquanto) Usar a lógica mock
    analise_resultado = await processar_imagem_real(file_location, foto_data)
    
    # 3. Adicionar o caminho da imagem ao resultado
    analise_resultado.view_bim_url = f"/static/uploads/{file.filename}"
    
    return analise_resultado

@app.get("/api/works/{obra_id}/photos")
async def listar_fotos_por_obra(obra_id: str):
    """Endpoint para buscar todas as fotos de uma obra."""
    fotos_da_obra = []
    
    for foto_id, data in fake_database.items():
        if data["upload_data"].obra_id == obra_id:
            fotos_da_obra.append({
                "foto_id": foto_id,
                **data
            })
    
    return fotos_da_obra

@app.get("/api/obras")
async def listar_obras():
    """Endpoint para listar todas as obras cadastradas."""
    # Por enquanto retorna mock, depois virá do banco
    return [
        {"id": "linha6-estaçãoFariaLima", "nome": "Linha 6 - Estação Faria Lima"},
        {"id": "linha2-expansão", "nome": "Linha 2 - Expansão Sul"}
    ]

@app.get("/api/photos/{foto_id}")
async def get_photo_details(foto_id: str):
    """Endpoint para buscar detalhes de uma foto específica."""
    # Por enquanto mock, depois buscará do banco
    return {
        "foto_id": foto_id,
        "detalhes": "Detalhes da foto específica",
        "analise": {"porcentagem": 85.0, "elementos": ["Viga", "Pilar"]}
    }

@app.get("/")
async def root():
    return {"message": "API de Monitoramento de Obras funcionando!"}