# mock_data.py
import random
from models import PhotoUpload, AnalysisResult

elementos = ["Viga", "Pilar", "Laje", "Duto", "Conduíte", "Armação"]

def gerar_analise_mock(foto_id: str, upload_data: PhotoUpload) -> AnalysisResult:
    num_elementos_detectados = random.randint(2, 5)
    elementos_detectados = random.choices(elementos, k=num_elementos_detectados)
    
    num_elementos_previstos = num_elementos_detectados + random.randint(0, 2)
    elementos_previstos = elementos_detectados + random.choices(
        elementos, k=num_elementos_previstos - num_elementos_detectados
    )
    
    porcentagem = (num_elementos_detectados / num_elementos_previstos) * 100
    
    discrepancias = []
    if porcentagem < 100:
        faltantes = set(elementos_previstos) - set(elementos_detectados)
        discrepancias = [f"{elemento} não instalado" for elemento in faltantes]

    return AnalysisResult(
        foto_id=foto_id,
        obra_id=upload_data.obra_id,
        porcentagem_conclusao=round(porcentagem, 2),
        elementos_identificados=elementos_detectados,
        elementos_previstos=elementos_previstos,
        discrepancias=discrepancias,
        view_bim_url="/static/mock_bim_view.png"
    )