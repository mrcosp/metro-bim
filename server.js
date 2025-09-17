// import express from "express";
// import bodyParser from "body-parser";
// import mongoose from "mongoose";
// import multer from "multer";
// import dotenv from "dotenv";
// import path, { dirname } from "path";
// import { fileURLToPath } from "url";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const app = express();

// // Servir a pasta TesteFotos como estática
// app.use(express.static(path.join(__dirname, 'TesteFotos')));

// app.set("views", path.join(__dirname, "TesteFotos"));
// app.set("view engine", "ejs");

// // MongoDB Schema
// const imgSchema = new mongoose.Schema({
//   name: String,
//   folder: String,
//   img: {
//     data: Buffer,
//     contentType: String
//   },
//   createdAt: { type: Date, default: Date.now }
// });

// const Image = mongoose.model("Image", imgSchema);

// // Conexão com MongoDB Atlas
// mongoose.connect(process.env.MONGO_URL)
//   .then(() => console.log("DB Connected"))
//   .catch(err => console.log(err));

// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

// // Multer para upload em memória (não salva no disco)
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// // Página única
// app.get('/', async (req, res) => {
//   const folders = await Image.distinct("folder");
//   res.render('index', { folders });
// });

// // Listar imagens de uma pasta (retorna JSON)
// app.get('/folder/:folderName', async (req, res) => {
//   const images = await Image.find({ folder: req.params.folderName });
//   res.json(images.map(img => ({
//     id: img._id,
//     name: img.name,
//     contentType: img.img.contentType
//   })));
// });

// // Get imagens
// app.get('/image/:id', async (req, res) => {
//   const image = await Image.findById(req.params.id);
//   if (!image) return res.sendStatus(404);
//   res.contentType(image.img.contentType);
//   res.send(image.img.data);
// });

// // Upload único ou múltiplo
// app.post('/upload', upload.array('images', 20), async (req, res) => {
//   let folder = req.body.folder; // pasta escolhida
//   if (!folder) folder = req.body.newFolder; // criar nova pasta

//   if (!req.files || req.files.length === 0) return res.send("Nenhum arquivo enviado");

//   try {
//     const images = req.files.map(file => ({
//       name: path.parse(file.originalname).name,
//       folder,
//       img: { data: file.buffer, contentType: file.mimetype }
//     }));

//     await Image.insertMany(images);
//     res.redirect('/');
//   } catch (err) {
//     console.log(err);
//     res.send("Erro ao salvar imagens");
//   }
// });

// // Deletar imagem
// app.delete('/delete/:id', async (req, res) => {
//   try {
//     await Image.findByIdAndDelete(req.params.id);
//     res.sendStatus(200);
//   } catch (err) {
//     console.log(err);
//     res.sendStatus(500);
//   }
// });

// // Servidor
// const port = process.env.PORT || 3000;
// app.listen(port, () => console.log(`Server listening on port ${port}`));
