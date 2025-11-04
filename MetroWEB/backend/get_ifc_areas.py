# MetroWEB/backend/get_ifc_areas.py
import ifcopenshell
import json
import sys
import os

# Caminho para o seu arquivo .ifc
CAMINHO_DO_IFC = 'C:/Users/Victor/Downloads/MB-1.04.04.00-6B3-1001-1_v32.ifc'

try:
    ifc_file = ifcopenshell.open(CAMINHO_DO_IFC)
    
    areas = []
    
    # Procura por Andares (BuildingStorey) e Espaços (Space)
    for element_type in ['IfcBuildingStorey', 'IfcSpace']:
        elements = ifc_file.by_type(element_type)
        for element in elements:
            if element.Name:
                
                # --- CORREÇÃO AQUI ---
                # Adiciona à lista apenas se o nome NÃO for puramente numérico
                if not element.Name.isdigit():
                    areas.append(element.Name)
                # --- FIM DA CORREÇÃO ---
                
    # Filtra nomes duplicados e ordena
    areas_unicas = sorted(list(set(areas)))
    
    # Imprime o JSON para o Node.js capturar (no stdout)
    print(json.dumps(areas_unicas))
    
except Exception as e:
    # Imprime o erro no stderr
    print(json.dumps({"error": f"Falha ao ler o arquivo IFC: {e}"}), file=sys.stderr)
    sys.exit(1)