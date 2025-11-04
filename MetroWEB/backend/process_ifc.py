# MetroWEB/backend/process_ifc.py
import ifcopenshell
import json
import sys
import os
import argparse # <-- Vamos usar argparse para aceitar argumentos

# --- ARQUIVOS DE CONFIGURAÇÃO ---
CAMINHO_DO_IFC = 'C:/Users/Victor/Downloads/MB-1.04.04.00-6B3-1001-1_v32.ifc'
ARQUIVO_MAPEAMENTO_LEGADO = 'area_mapping.json' # (Ainda usado para o modo "gerar todos")

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

def gerar_plano_unico(base_dir, ifc_file, nome_pasta_limpo, nome_ifc):
    """Gera um único arquivo de plano base."""
    print(f"\nProcessando pasta: '{nome_pasta_limpo}' (Mapeada para: '{nome_ifc}')")
    
    # 1. Encontrar a área no IFC
    area_ifc = encontrar_area_no_ifc(ifc_file, nome_ifc)
    
    if not area_ifc:
        print(f"  [ERRO] A área técnica '{nome_ifc}' não foi encontrada no IFC. Pulando...")
        return False
        
    print(f"  -> Área '{nome_ifc}' encontrada (ID: {area_ifc.id()}). Contando elementos...")
    
    # 2. Contar os elementos dentro dela
    plano_json = contar_elementos_na_area(ifc_file, area_ifc)
    
    # 3. Salvar o arquivo de plano (ex: 'plano_base_teste.json')
    nome_arquivo_saida = f"plano_base_{nome_pasta_limpo}.json"
    caminho_saida = os.path.join(base_dir, nome_arquivo_saida)
    
    try:
        with open(caminho_saida, 'w', encoding='utf-8') as f:
            json.dump(plano_json, f, indent=2)
        print(f"  -> SUCESSO! Plano salvo em '{nome_arquivo_saida}'.")
        print(f"     {json.dumps(plano_json)}")
        return True
    except Exception as e:
        print(f"  [ERRO] Falha ao salvar o arquivo '{nome_arquivo_saida}'. {e}")
        return False

# --- PONTO DE ENTRADA (MAIN) ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Gerador de Plano Base BIM.')
    parser.add_argument('--folder', type=str, help='Nome da pasta amigável (ex: "joao")')
    parser.add_argument('--ifc_name', type=str, help='Nome técnico da área no IFC (ex: "EST - 04.PLATAFORMA")')
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. Carregar o arquivo IFC (uma única vez)
    try:
        print(f"Carregando arquivo BIM de: {CAMINHO_DO_IFC}")
        ifc_file = ifcopenshell.open(CAMINHO_DO_IFC)
    except Exception as e:
        print(f"Erro CRÍTICO ao abrir o arquivo IFC: {e}", file=sys.stderr)
        sys.exit(1)

    # --- MODO 2: GERAÇÃO ÚNICA (Chamado pelo Node.js) ---
    if args.folder and args.ifc_name:
        print(f"Modo de Geração Única para pasta: {args.folder}")
        nome_pasta_limpo = args.folder.lower().strip()
        gerar_plano_unico(base_dir, ifc_file, nome_pasta_limpo, args.ifc_name)
    
    # --- MODO 1: GERAÇÃO EM LOTE (Legado, para rodar manualmente) ---
    else:
        print("Modo de Geração em Lote (lendo 'area_mapping.json')")
        caminho_mapa = os.path.join(base_dir, ARQUIVO_MAPEAMENTO_LEGADO)
        
        try:
            with open(caminho_mapa, 'r', encoding='utf-8') as f:
                mapeamento_pastas = json.load(f)
            print(f"Arquivo de mapeamento '{ARQUIVO_MAPEAMENTO_LEGADO}' carregado (UTF-8).")
        except Exception as e:
            print(f"Erro CRÍTICO: Não foi possível ler o arquivo '{ARQUIVO_MAPEAMENTO_LEGADO}'. {e}")
            sys.exit(1)

        print("-" * 50)
        print("Iniciando geração de TODOS os planos base...")

        for nome_pasta, nome_ifc in mapeamento_pastas.items():
            nome_pasta_limpo = nome_pasta.lower().strip()
            gerar_plano_unico(base_dir, ifc_file, nome_pasta_limpo, nome_ifc)
            
        print("-" * 50)
        print("Geração de planos em lote concluída.")