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

# --- 1. CONFIGURAÇÕES DE PROGRESSO ---
MAPEAMENTO_ID_NOME = {
    1: 'total_concreto',      # ASSUMINDO 1 = VERMELHO
    2: 'total_metal',         # ASSUMINDO 2 = VERDE
    3: 'total_deck_metalico'  # ASSUMINDO 3 = AZUL
}

# --- 2. FUNÇÕES DE CONTAGEM (Pixels) ---
def contar_area_pixels(prediction_map):
    """(NOVA LÓGICA) Conta quantos 'pixels' de cada classe existem."""
    contagem_real_pixels = {}
    for class_id, class_name in MAPEAMENTO_ID_NOME.items():
        # Cria a máscara (array de True/False)
        mask = (prediction_map == class_id)
        
        # Conta quantos pixels são 'True' (ou seja, pertencem à classe)
        num_pixels = np.count_nonzero(mask)
        
        if num_pixels > 0:
            # Salva a contagem de PIXELS
            contagem_real_pixels[class_name] = int(num_pixels) # Converte para int nativo
            
    return contagem_real_pixels
# -------------------------------------------------------------------

# --- 3. FUNÇÃO DE ATUALIZAR PROGRESSO (COM A MUDANÇA) ---
def atualizar_progresso(area_nome_base, nova_contagem_ia):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Aponta para a pasta /json_files/
    json_dir = os.path.join(base_dir, "json_files")
    os.makedirs(json_dir, exist_ok=True) # Garante que a pasta exista
    ARQUIVO_PLANO = os.path.join(json_dir, f"plano_base_{area_nome_base}.json")
    ARQUIVO_PROGRESSO = os.path.join(json_dir, f"progresso_{area_nome_base}.json")

    # 1. Carregar Plano Base
    if not os.path.exists(ARQUIVO_PLANO):
        raise Exception(f"Arquivo de plano '{ARQUIVO_PLANO}' não encontrado. (Execute o Passo 1 de Calibração)")
    with open(ARQUIVO_PLANO, 'r', encoding='utf-8') as f:
        plano_base = json.load(f)

    # --- INÍCIO DA MUDANÇA (PYTHON) ---
    # Precisamos do total planejado AQUI para calcular o % da imagem
    total_planejado_geral = plano_base.get('total_elementos_geral', 1) 
    if total_planejado_geral == 0: total_planejado_geral = 1 
    
    # Calcula o total de pixels brutos detectados NESTA IMAGEM
    # (Usamos .values() da contagem que a IA acabou de fazer)
    total_pixels_desta_imagem = sum(nova_contagem_ia.values())
    
    # Calcula o percentual APENAS desta imagem
    percentual_da_imagem = (total_pixels_desta_imagem / total_planejado_geral) * 100
    # --- FIM DA MUDANÇA (PYTHON) ---

    # 2. Carregar Progresso Atual (ou criar novo)
    progresso_atual = {}
    if os.path.exists(ARQUIVO_PROGRESSO):
        try:
            with open(ARQUIVO_PROGRESSO, 'r', encoding='utf-8') as f:
                progresso_atual = json.load(f)
        except json.JSONDecodeError:
            progresso_atual = {} 

    # 3. Atualizar Progresso (Lógica MAX)
    for nome_classe_ia, contagem_ia in nova_contagem_ia.items():
        chave_progresso = nome_classe_ia.replace('total_', '') 
        if chave_progresso not in progresso_atual:
            progresso_atual[chave_progresso] = 0 

        chave_plano = nome_classe_ia 
        limite_plano = plano_base.get(chave_plano, 0)
        valor_antigo = progresso_atual[chave_progresso]
        # Esta é a sua lógica de "recorde" (High-score)
        valor_novo_max = max(valor_antigo, contagem_ia)
        valor_final = min(valor_novo_max, limite_plano)
        progresso_atual[chave_progresso] = valor_final

    # 4. Recalcular o Total Geral (baseado nos valores MÁXIMOS salvos)
    total_executado_geral = sum(progresso_atual.get(v.replace('total_', ''), 0) for v in MAPEAMENTO_ID_NOME.values())
    progresso_atual['elementos_executados_geral'] = total_executado_geral

    # 5. Salvar o arquivo de progresso
    with open(ARQUIVO_PROGRESSO, 'w', encoding='utf-8') as f:
        json.dump(progresso_atual, f, indent=4)
        
    # 6. Preparar JSON de Retorno
    # O percentual geral é baseado no 'total_executado_geral' (o recorde salvo)
    percentual_geral = (total_executado_geral / total_planejado_geral) * 100
    
    return {
        "area_inspecionada": area_nome_base,
        # O % GERAL (ex: 100%)
        "porcentagem_geral": round(percentual_geral, 2), 
        
        # --- ADICIONADO ---
        # O % SÓ DA IMAGEM (ex: 5%)
        "porcentagem_imagem": round(percentual_da_imagem, 2), 
        # --- FIM DA ADIÇÃO ---

        "total_executado": total_executado_geral,
        "total_planejado": total_planejado_geral,
        "detalhes_executados": progresso_atual,
        "detalhes_plano": plano_base
    }
# --- FIM DA FUNÇÃO ---

# --- 4. FUNÇÃO DE INFERÊNCIA ---
def inference_model(model_path, image_path, output_dir, channels, area_nome):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Usando dispositivo: {device}", file=sys.stderr)
    
    try:
        torch.serialization.add_safe_globals([DeepLabV3])
        model = torch.load(model_path, map_location=device, weights_only=False)
        model = model.to(device)
        model.eval()
        print("Modelo carregado de objeto completo", file=sys.stderr)
    except Exception as e:
        print(f"Erro ao carregar modelo: {e}", file=sys.stderr)
        return

    COLOR_MAP = { 0: [0, 0, 0], 1: [255, 0, 0], 2: [0, 255, 0], 3: [0, 0, 255] }
    
    try:
        original_image = Image.open(image_path).convert('RGB')
        print(f"Imagem original: {original_image.size}", file=sys.stderr)
    except Exception as e:
        print(f"Erro ao carregar imagem: {e}", file=sys.stderr)
        return
    
    def prepare_image(image_pil, target_size=512):
        image_resized = image_pil.resize((target_size, target_size), Image.LANCZOS)
        image_array = np.array(image_resized).astype(np.float32)
        tensor = torch.from_numpy(image_array).permute(2, 0, 1).float()
        tensor = tensor.unsqueeze(0)
        return tensor.to(device), image_resized
    
    input_tensor, resized_image = prepare_image(original_image)
    
    with torch.no_grad():
        output = model(input_tensor)
        pred = torch.argmax(output, dim=1).squeeze(0)
        prediction_map = pred.cpu().numpy().astype(np.uint8)
    
    os.makedirs(output_dir, exist_ok=True)
    original_resized = original_image.resize((512, 512), Image.LANCZOS)
    original_array = np.array(original_resized).astype(np.float32)
    overlay_original = original_array.copy()
    for class_id, color in COLOR_MAP.items():
        if class_id != 0:
            mask = prediction_map == class_id
            overlay_original[mask] = 0.6 * overlay_original[mask] + 0.4 * np.array(color)
    overlay_original = overlay_original.astype(np.uint8)
    overlay_path = os.path.join(output_dir, 'overlay.png')
    Image.fromarray(overlay_original).save(overlay_path)
    original_image.save(os.path.join(output_dir, 'original.png'))
    print(f"Resultados de imagem salvos em: {output_dir}", file=sys.stderr)


    # --- 5. LÓGICA DE PROGRESSO (Atualizada com DEBUG) ---
    try:
        # Trocamos para a função de contagem de PIXELS
        contagem_ia = contar_area_pixels(prediction_map) 

        # --- LINHA DE DEBUG ADICIONADA ---
        # Esta linha imprime a contagem bruta no terminal (stderr)
        print(f"DEBUG: Contagem de pixels brutos detectados: {json.dumps(contagem_ia)}", file=sys.stderr)
        # --- FIM DA LINHA DE DEBUG ---

        if not contagem_ia:
            # Mesmo se não detectar nada, precisamos retornar os valores corretos
            # Chamamos a função com uma contagem vazia
            resultado_progresso = atualizar_progresso(area_nome, {})
        else:
            # Chama a função de progresso 
            resultado_progresso = atualizar_progresso(area_nome, contagem_ia)
        
        resultado_progresso['overlay'] = f"/results/{os.path.basename(output_dir)}/overlay.png"
        
        # Imprime o JSON final para o Node.js
        print(json.dumps(resultado_progresso, indent=2))
        
    except Exception as e:
        # Imprime o JSON de ERRO para o Node.js
        print(json.dumps({
            "error": f"Falha ao calcular progresso: {e}",
            "overlay": f"/results/{os.path.basename(output_dir)}/overlay.png"
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