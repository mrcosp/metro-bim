import ifcopenshell
import json
import sys
import os

# --- CORREÇÃO DE CAMINHO ---
base_dir = os.path.dirname(os.path.abspath(__file__))
CAMINHO_DO_IFC = os.path.join(base_dir, 'MB-1.04.04.00-6B3-1001-1_v32.ifc')
# --- FIM DA CORREÇÃO ---

try:
    if not os.path.exists(CAMINHO_DO_IFC):
        raise Exception(f"Arquivo IFC não encontrado em '{CAMINHO_DO_IFC}'. Coloque-o na pasta /backend.")

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