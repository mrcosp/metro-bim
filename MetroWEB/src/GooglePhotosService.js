// src/GooglePhotosService.js
import { gapi } from "gapi-script";

const CLIENT_ID = "69718066132-i9v9vmkiosfs443amn2rav6boicgbntq.apps.googleusercontent.com.apps.googleusercontent.com";
const SCOPES =
  "https://www.googleapis.com/auth/photoslibrary https://www.googleapis.com/auth/photoslibrary.sharing";

class GooglePhotosService {
  constructor() {
    this.token = null;
  }

  // Inicializa o cliente Google
  async init() {
    return new Promise((resolve) => {
      gapi.load("client:auth2", async () => {
        await gapi.client.init({
          clientId: CLIENT_ID,
          scope: SCOPES,
        });
        resolve();
      });
    });
  }

  // Login
  async login() {
    const GoogleAuth = gapi.auth2.getAuthInstance();
    const user = await GoogleAuth.signIn();
    this.token = user.getAuthResponse().access_token;
    console.log("Token obtido:", this.token); 
    return this.token;
  }

  // GET: lista fotos
  async getPhotos(pageSize = 10) {
    if (!this.token) throw new Error("Usuário não autenticado!");

    const res = await fetch(
      `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=${pageSize}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );
    const data = await res.json();
    return data.mediaItems || [];
  }

  // POST: envia foto
  async uploadPhoto(file) {
    if (!this.token) throw new Error("Usuário não autenticado!");

    // Upload Foto
    const uploadRes = await fetch(
      "https://photoslibrary.googleapis.com/v1/uploads",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/octet-stream",
          "X-Goog-Upload-File-Name": file.name,
          "X-Goog-Upload-Protocol": "raw",
        },
        body: file,
      }
    );

    const uploadToken = await uploadRes.text();

    // Cria o item na biblioteca
    const createRes = await fetch(
      "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newMediaItems: [
            {
              description: "Upload via React",
              simpleMediaItem: { uploadToken },
            },
          ],
        }),
      }
    );

    const result = await createRes.json();
    return result;
  }
}

// Instância única
const googlePhotosService = new GooglePhotosService();
export default googlePhotosService;

// Exemplo de teste rápido (somente para navegador/React)
export async function testService() {
  await googlePhotosService.init();
  await googlePhotosService.login();
  const photos = await googlePhotosService.getPhotos(5);
  console.log("Fotos obtidas:", photos);
}
