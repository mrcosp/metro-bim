import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# scripts/populate_test_data.py
import asyncio
from datetime import datetime, timedelta
from services.ia_service import processar_imagem_real
from models import PhotoUpload



async def popular_dados_teste():
    """Popula o sistema com dados de teste realistas"""
    
    obras = ["linha6-estaçãoFariaLima", "linha2-expansão"]
    locais = ["Pilar P-23", "Viga V-15", "Laje L-08", "Duto D-12"]
    
    # Simular uploads dos últimos 30 dias
    for i in range(30):
        for obra_id in obras:
            data = datetime.now() - timedelta(days=30-i)
            
            foto_data = PhotoUpload(
                obra_id=obra_id,
                timestamp=data,
                latitude=-23.5810 + (i * 0.0001),
                longitude=-46.6846 + (i * 0.0001),
                local_na_obra=locais[i % len(locais)]
            )
            
            # Simular processamento
            resultado = await processar_imagem_real("caminho/fake/image.jpg", foto_data)
            print(f"Simulado: {obra_id} - {data.date()} - {resultado.porcentagem_conclusao}%")

if __name__ == "__main__":
    asyncio.run(popular_dados_teste())