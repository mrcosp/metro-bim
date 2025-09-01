import cv2
import matplotlib.pyplot as plt

# Arquivos IFC renderizados


# Foto real de teste
photo_path = "MetroWEB\\foto_casa.png"
img = cv2.imread("MetroWEB\\foto_casa.png")

t_lower = 100
t_upper = 200 
aperture_size = 5
L2Gradient = True 
photo = cv2.Canny(img, t_lower, t_upper, L2gradient = L2Gradient )

ref_imgs = {
    "Vista3D_1": "MetroWEB\\Vista3D_1.jpg",
    "Vista3D_2": "MetroWEB\\Vista3D_2.jpg",
    "Vista3D_3": "MetroWEB\\Vista3D_3.jpg"
}

# Carregar imagens
# photo = cv2.imread(photo_path, cv2.IMREAD_GRAYSCALE)

# Criar detector ORB
orb = cv2.ORB_create(nfeatures=2000)

# Extrair keypoints da foto real
kp_photo, des_photo = orb.detectAndCompute(photo, None)

bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

scores = {}

for name, path in ref_imgs.items():
    ref = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    pht = cv2.Canny(ref, t_lower, t_upper, L2gradient = L2Gradient )
    kp_ref, des_ref = orb.detectAndCompute(pht, None)

    if des_ref is None or des_photo is None:
        print(f"Nao foi possivel extrair features para {name}")
        continue

    matches = bf.match(des_photo, des_ref)
    matches = sorted(matches, key=lambda x: x.distance)

    # Calcular score (quanto menor a média da distância, mais parecido)
    score = sum([m.distance for m in matches[:50]]) / len(matches[:50])
    scores[name] = score

    # Visualizar os matches
    img_matches = cv2.drawMatches(photo, kp_photo, ref, kp_ref, matches[:30], None, flags=2)

    plt.figure(figsize=(12, 6))
    plt.title(f"Comparacao com {name} - Score: {score:.2f}")
    plt.imshow(img_matches)
    plt.axis("off")
    plt.show()

print("\nRanking de similaridade (quanto menor o score, melhor):")
for name, score in sorted(scores.items(), key=lambda x: x[1]):
    print(f"{name}: {score:.2f}")
