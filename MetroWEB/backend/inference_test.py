# MetroWEB/backend/inference_test.py
import torch
import numpy as np
from PIL import Image
import argparse 
import os
import matplotlib.pyplot as plt
import cv2 
import json 
import sys 

# Importação do modelo
from model_plus import createDeepLabv3Plus
from network._deeplab import DeepLabV3

# --- 1. CONFIGURAÇÕES DE PROGRESSO (Lógica Nova) ---
MAPEAMENTO_ID_NOME = {
    1: 'total_concreto',      # ASSUMINDO 1 = VERMELHO
    2: 'total_metal',         # ASSUMINDO 2 = VERDE
    3: 'total_deck_metalico'  # ASSUMINDO 3 = AZUL
}

# --- 2. FUNÇÃO DE CONTAGEM DE INSTÂNCIAS (Lógica Nova) ---
def contar_instancias(prediction_map):
    contagem_real = {}
    for class_id, class_name in MAPEAMENTO_ID_NOME.items():
        mask = (prediction_map == class_id).astype(np.uint8)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        num_instancias = len(contours)
        
        if num_instancias > 0:
            contagem_real[class_name] = num_instancias
    return contagem_real

# --- 3. FUNÇÃO DE ATUALIZAR PROGRESSO (Lógica Nova) ---
def atualizar_progresso(area_nome_base, nova_contagem):
    # Encontra os arquivos de progresso (na mesma pasta do script)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ARQUIVO_PLANO = os.path.join(base_dir, f"plano_base_{area_nome_base}.json")
    ARQUIVO_PROGRESSO = os.path.join(base_dir, f"progresso_{area_nome_base}.json")

    if not os.path.exists(ARQUIVO_PLANO):
        raise Exception(f"Arquivo de plano '{ARQUIVO_PLANO}' não encontrado.")

    with open(ARQUIVO_PLANO, 'r', encoding='utf-8') as f: # Adicionado encoding
        plano_base = json.load(f)
        
    if os.path.exists(ARQUIVO_PROGRESSO):
        with open(ARQUIVO_PROGRESSO, 'r', encoding='utf-8') as f: # Adicionado encoding
            progresso_atual = json.load(f)
    else:
        progresso_atual = {key.replace('total_', ''): 0 for key in plano_base if key.startswith('total_')}
        progresso_atual['elementos_executados_geral'] = 0
        
    # Atualiza o progresso
    houve_mudanca = False
    for nome_classe_ia, contagem_ia in nova_contagem.items():
        chave_progresso = nome_classe_ia.replace('total_', '') 
        if chave_progresso in progresso_atual:
            chave_plano = f"total_{chave_progresso}"
            limite_plano = plano_base.get(chave_plano, 0)
            
            valor_antigo = progresso_atual[chave_progresso]
            valor_novo = valor_antigo + contagem_ia
            valor_final = min(valor_novo, limite_plano)
            
            if progresso_atual[chave_progresso] != valor_final:
                progresso_atual[chave_progresso] = valor_final
                houve_mudanca = True

    # Recalcula Totais
    total_executado = 0
    if houve_mudanca:
        for key in progresso_atual:
            if key != 'elementos_executados_geral':
                total_executado += progresso_atual[key]
        progresso_atual['elementos_executados_geral'] = total_executado
    else:
        total_executado = progresso_atual.get('elementos_executados_geral', 0)
        
    total_planejado = plano_base.get('total_elementos_geral', 1)
    if total_planejado == 0: total_planejado = 1 
        
    percentual_geral = (total_executado / total_planejado) * 100
    
    # Salva o progresso
    with open(ARQUIVO_PROGRESSO, 'w', encoding='utf-8') as f: # Adicionado encoding
        json.dump(progresso_atual, f, indent=2)
        
    # Retorna o JSON de resultado
    return {
        "area_inspecionada": area_nome_base,
        "porcentagem_geral": round(percentual_geral, 2),
        "total_executado": total_executado,
        "total_planejado": total_planejado,
        "detalhes_executados": progresso_atual,
        "detalhes_plano": plano_base
    }

# --- 4. SUA FUNÇÃO DE INFERÊNCIA (MODIFICADA) ---
def inference_model(model_path, image_path, output_dir, channels, area_nome): # <-- Adicionado 'area_nome'
    # Configurar dispositivo
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Usando dispositivo: {device}", file=sys.stderr) # Log no Stderr
    
    # --- Carregar modelo ---
    try:
        # Adicionamos a classe como "segura"
        torch.serialization.add_safe_globals([DeepLabV3])
        model = torch.load(model_path, map_location=device, weights_only=False)
        model = model.to(device)
        model.eval()
        print("Modelo carregado de objeto completo", file=sys.stderr)
    except Exception as e:
        print(f"Erro ao carregar modelo: {e}", file=sys.stderr)
        return

    # Mapeamento das classes (Seu)
    COLOR_MAP = {
        0: [0, 0, 0],       # Background - Preto
        1: [255, 0, 0],     # Classe 1 - Vermelho
        2: [0, 255, 0],     # Classe 2 - Verde
        3: [0, 0, 255]      # Classe 3 - Azul
    }
    
    # --- Carregar e preparar imagem ---
    try:
        original_image = Image.open(image_path).convert('RGB')
        print(f"Imagem original: {original_image.size}", file=sys.stderr)
    except Exception as e:
        print(f"Erro ao carregar imagem: {e}", file=sys.stderr)
        return
    
    # PRÉ-PROCESSAMENTO (raw255 como no treino) (Seu)
    def prepare_image(image_pil, target_size=512):
        image_resized = image_pil.resize((target_size, target_size), Image.LANCZOS)
        image_array = np.array(image_resized).astype(np.float32)
        tensor = torch.from_numpy(image_array).permute(2, 0, 1).float()
        tensor = tensor.unsqueeze(0)
        return tensor.to(device), image_resized
    
    input_tensor, resized_image = prepare_image(original_image)
    
    # --- Fazer predição ---
    with torch.no_grad():
        output = model(input_tensor)
        pred = torch.argmax(output, dim=1).squeeze(0)
        prediction_map = pred.cpu().numpy().astype(np.uint8)
    
    # --- Criar visualizações (Seu) ---
    os.makedirs(output_dir, exist_ok=True)
    
    original_resized = original_image.resize((512, 512), Image.LANCZOS)
    original_array = np.array(original_resized).astype(np.float32)
    overlay_original = original_array.copy()
    
    for class_id, color in COLOR_MAP.items():
        if class_id != 0:
            mask = prediction_map == class_id
            overlay_original[mask] = 0.6 * overlay_original[mask] + 0.4 * np.array(color)
    
    overlay_original = overlay_original.astype(np.uint8)
    
    # Salvar resultados
    overlay_path = os.path.join(output_dir, 'overlay.png')
    Image.fromarray(overlay_original).save(overlay_path)
    original_image.save(os.path.join(output_dir, 'original.png'))
    
    print(f"Resultados de imagem salvos em: {output_dir}", file=sys.stderr)

    # --- 5. LÓGICA DE PROGRESSO (NOVA) ---
    try:
        # 4. Contar Instâncias
        contagem_ia = contar_instancias(prediction_map)
        
        if not contagem_ia:
            raise Exception("Nenhum material (Concreto, Metal, Deck) foi detectado na imagem.")

        # 5. Atualizar Progresso
        resultado_progresso = atualizar_progresso(area_nome, contagem_ia)
        
        # Adiciona o caminho do overlay ao resultado final
        # (Corrigido para 'overlay' para bater com o seu frontend)
        resultado_progresso['overlay'] = f"/results/{os.path.basename(output_dir)}/overlay.png"
        
        # 6. Imprimir JSON final para o Node.js (NO STDOUT)
        print(json.dumps(resultado_progresso, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "error": f"Falha ao calcular progresso: {e}",
            "overlay": f"/results/{os.path.basename(output_dir)}/overlay.png" # Ainda retorna o overlay
        }))

# --- 6. PONTO DE ENTRADA (MAIN) ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Teste de inferência para modelo')
    parser.add_argument('--model_path', required=True, help='Caminho para o modelo .pt')
    parser.add_argument('--image_path', required=True, help='Caminho para a imagem de teste')
    parser.add_argument('--output_dir', default='./inference_results', help='Pasta para salvar resultados')
    parser.add_argument('--channels', type=int, default=4, help='Número de classes')
    parser.add_argument('--area', required=True, help='A zona de inspeção (ex: plataforma)')
    
    args = parser.parse_args()
    
    print("Iniciando teste de inferência...", file=sys.stderr)
    print(f"Modelo: {args.model_path}", file=sys.stderr)
    print(f"Imagem: {args.image_path}", file=sys.stderr)
    print(f"Saída: {args.output_dir}", file=sys.stderr)
    print(f"Classes: {args.channels}", file=sys.stderr)
    print(f"Área: {args.area}", file=sys.stderr)
    print("-" * 50, file=sys.stderr)
    
    inference_model(
        model_path=args.model_path,
        image_path=args.image_path,
        output_dir=args.output_dir,
        channels=args.channels,
        area_nome=args.area
    )