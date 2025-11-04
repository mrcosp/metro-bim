# MetroWEB/backend/process_ifc.py
import ifcopenshell
import json
import sys
import os

# --- ARQUIVOS DE CONFIGURAÇÃO ---
CAMINHO_DO_IFC = 'C:/Users/Victor/Downloads/MB-1.04.04.00-6B3-1001-1_v32.ifc'
ARQUIVO_MAPEAMENTO = 'area_mapping.json' # <-- O "Tradutor"

# --- MAPEAMENTO IA -> BIM (Tipos de Elemento) ---
MAPEAMENTO_CLASSES = {
    'total_concreto': ['IfcWall', 'IfcSlab', 'IfcStair'],
    'total_metal': ['IfcRailing', 'IfcCurtainWall'],     
    'total_deck_metalico': ['IfcCovering']               
}
# -----------------------------------------------------------

def encontrar_area_no_ifc(ifc_file, nome_area_ifc):
    """Encontra um elemento espacial (Andar ou Espaço) pelo nome técnico."""
    for element_type in ['IfcBuildingStorey', 'IfcSpace']:
        elements = ifc_file.by_type(element_type)
        for element in elements:
            if element.Name == nome_area_ifc:
                return element
    return None

def contar_elementos_na_area(ifc_file, area_encontrada):
    """Conta os elementos (baseado no MAPEAMENTO_CLASSES) dentro de uma área espacial."""
    plano_esperado = { nome_ia: 0 for nome_ia in MAPEAMENTO_CLASSES.keys() }
    plano_esperado['total_elementos_geral'] = 0

    for nome_ia, tipos_ifc in MAPEAMENTO_CLASSES.items():
        for tipo_ifc in tipos_ifc:
            elementos = ifc_file.by_type(tipo_ifc)
            for elemento in elementos:
                try:
                    if elemento.ContainedInStructure and len(elemento.ContainedInStructure) > 0:
                        estrutura_pai = elemento.ContainedInStructure[0].RelatingStructure
                        if estrutura_pai.id() == area_encontrada.id():
                            plano_esperado[nome_ia] += 1
                            plano_esperado['total_elementos_geral'] += 1
                except Exception:
                    pass # Ignora elementos sem estrutura
    return plano_esperado

# --- PONTO DE ENTRADA (MAIN) ---
if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    caminho_mapa = os.path.join(base_dir, ARQUIVO_MAPEAMENTO)
    
    # 1. Carregar o arquivo de mapeamento (o "tradutor")
    try:
        # Força a leitura em UTF-8 por causa dos acentos
        with open(caminho_mapa, 'r', encoding='utf-8') as f:
            mapeamento_pastas = json.load(f)
        print(f"Arquivo de mapeamento '{ARQUIVO_MAPEAMENTO}' carregado (UTF-8).")
    except Exception as e:
        print(f"Erro CRÍTICO: Não foi possível ler o arquivo '{ARQUIVO_MAPEAMENTO}'. {e}")
        sys.exit(1)
        
    # 2. Carregar o arquivo IFC (uma única vez)
    try:
        print(f"Carregando arquivo BIM de: {CAMINHO_DO_IFC}")
        ifc_file = ifcopenshell.open(CAMINHO_DO_IFC)
    except Exception as e:
        print(f"Erro CRÍTICO ao abrir o arquivo IFC: {e}")
        sys.exit(1)

    print("-" * 50)
    print("Iniciando geração de TODOS os planos base...")

    # 3. Iterar sobre o mapeamento e gerar um plano para CADA pasta
    for nome_pasta, nome_ifc in mapeamento_pastas.items():
        # Limpa o nome da pasta (lowercase) para garantir o match do arquivo
        nome_pasta_limpo = nome_pasta.lower().strip()
        
        print(f"\nProcessando pasta: '{nome_pasta_limpo}' (Mapeada para: '{nome_ifc}')")
        
        # 3a. Encontrar a área no IFC
        area_ifc = encontrar_area_no_ifc(ifc_file, nome_ifc)
        
        if not area_ifc:
            print(f"  [ERRO] A área técnica '{nome_ifc}' não foi encontrada no IFC. Pulando...")
            continue
            
        print(f"  -> Área '{nome_ifc}' encontrada (ID: {area_ifc.id()}). Contando elementos...")
        
        # 3b. Contar os elementos dentro dela
        plano_json = contar_elementos_na_area(ifc_file, area_ifc)
        
        # 3c. Salvar o arquivo de plano (ex: 'plano_base_teste.json')
        nome_arquivo_saida = f"plano_base_{nome_pasta_limpo}.json"
        caminho_saida = os.path.join(base_dir, nome_arquivo_saida)
        
        try:
            with open(caminho_saida, 'w', encoding='utf-8') as f:
                json.dump(plano_json, f, indent=2)
            print(f"  -> SUCESSO! Plano salvo em '{nome_arquivo_saida}'.")
            print(f"     {json.dumps(plano_json)}")
        except Exception as e:
            print(f"  [ERRO] Falha ao salvar o arquivo '{nome_arquivo_saida}'. {e}")
            
    print("-" * 50)
    print("Geração de planos concluída.")