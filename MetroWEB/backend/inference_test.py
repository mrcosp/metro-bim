import torch
import numpy as np
from PIL import Image
import argparse
import os
import matplotlib.pyplot as plt

def inference_model(model_path, image_path, output_dir, channels=4):
    """
    Script de inferência para testar o modelo
    """
    # Configurar dispositivo
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Usando dispositivo: {device}")
    
    # Carregar modelo
    from model_plus import createDeepLabv3Plus
    model = createDeepLabv3Plus(outputchannels=channels)
    
    # Carregar pesos
    try:
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        
        if hasattr(checkpoint, 'state_dict'):
            # É um modelo completo
            model.load_state_dict(checkpoint.state_dict())
            print("Modelo carregado de objeto completo")
        elif isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
            # É um state_dict
            model.load_state_dict(checkpoint['model_state_dict'])
            print("Modelo carregado de state_dict")
        else:
            # Tentar carregar diretamente
            model.load_state_dict(checkpoint)
            print("Modelo carregado diretamente")
            
    except Exception as e:
        print(f"Erro ao carregar modelo: {e}")
        return
    
    model = model.to(device)
    model.eval()
    print("Modelo preparado para inferência")
    
    # Mapeamento das classes
    COLOR_MAP = {
        0: [0, 0, 0],      # Background - Preto
        1: [255, 0, 0],    # Classe 1 - Vermelho
        2: [0, 255, 0],    # Classe 2 - Verde
        3: [0, 0, 255]     # Classe 3 - Azul
    }
    
    # Carregar e preparar imagem
    try:
        original_image = Image.open(image_path).convert('RGB')
        print(f"Imagem original: {original_image.size}")
    except Exception as e:
        print(f"Erro ao carregar imagem: {e}")
        return
    
    # PRÉ-PROCESSAMENTO (raw255 como no treino)
    def prepare_image(image_pil, target_size=512):
        """Pré-processamento usado no treino"""
        # Redimensionar
        image_resized = image_pil.resize((target_size, target_size), Image.LANCZOS)
        
        # Converter para array numpy (0-255)
        image_array = np.array(image_resized).astype(np.float32)
        
        # Para tensor: [H, W, C] -> [C, H, W]
        tensor = torch.from_numpy(image_array).permute(2, 0, 1).float()
        
        # Adicionar dimensão batch: [1, C, H, W]
        tensor = tensor.unsqueeze(0)
        
        return tensor.to(device), image_resized
    
    # Preparar imagem
    input_tensor, resized_image = prepare_image(original_image)
    print(f"Input tensor shape: {input_tensor.shape}")
    print(f"Input range: {input_tensor.min():.1f} - {input_tensor.max():.1f}")
    
    # Fazer predição
    with torch.no_grad():
        output = model(input_tensor)
        pred = torch.argmax(output, dim=1).squeeze(0)
        prediction = pred.cpu().numpy().astype(np.uint8)
    
    # Estatísticas detalhadas
    for class_id in range(channels):
        count = np.sum(prediction == class_id)
        percentage = (count / prediction.size) * 100
        print(f"Classe {class_id}: {count:6d} pixels ({percentage:6.2f}%)")
    
    # Criar visualizações
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Máscara colorida
    colored_mask = np.zeros((prediction.shape[0], prediction.shape[1], 3), dtype=np.uint8)
    for class_id, color in COLOR_MAP.items():
        colored_mask[prediction == class_id] = color
    
    # 2. Sobreposição na imagem redimensionada
    overlay_image = np.array(resized_image).copy().astype(np.float32)
    for class_id, color in COLOR_MAP.items():
        if class_id != 0:  # Não sobrepor background
            mask = prediction == class_id
            overlay_image[mask] = 0.7 * overlay_image[mask] + 0.3 * np.array(color)
    
    overlay_image = overlay_image.astype(np.uint8)
    
    # 3. Sobreposição na imagem original (redimensionada)
    original_resized = original_image.resize((512, 512), Image.LANCZOS)
    original_array = np.array(original_resized).astype(np.float32)
    overlay_original = original_array.copy()
    
    for class_id, color in COLOR_MAP.items():
        if class_id != 0:
            mask = prediction == class_id
            overlay_original[mask] = 0.6 * overlay_original[mask] + 0.4 * np.array(color)
    
    overlay_original = overlay_original.astype(np.uint8)
    
    # Salvar resultados
    Image.fromarray(overlay_original).save(os.path.join(output_dir, 'overlay.png'))
    original_image.save(os.path.join(output_dir, 'original.png'))
    
    print(f"\nInferência concluída!")
    print(f"Resultados salvos em: {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Teste de inferência para modelo')
    parser.add_argument('--model_path', required=True, help='Caminho para o modelo .pt')
    parser.add_argument('--image_path', required=True, help='Caminho para a imagem de teste')
    parser.add_argument('--output_dir', default='./inference_results', help='Pasta para salvar resultados')
    parser.add_argument('--channels', type=int, default=4, help='Número de classes')
    
    args = parser.parse_args()
    
    print("Iniciando teste de inferência...")
    print(f"Modelo: {args.model_path}")
    print(f"Imagem: {args.image_path}")
    print(f"Saída: {args.output_dir}")
    print(f"Classes: {args.channels}")
    print("-" * 50)
    
    inference_model(
        model_path=args.model_path,
        image_path=args.image_path,
        output_dir=args.output_dir,
        channels=args.channels
    )