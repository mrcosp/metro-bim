import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";
import bcrypt from 'bcryptjs';
import adminAuth from './middleware/adminAuth.js';
import User from './models/User.js';
import path, { dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resultsDir = path.join(__dirname, "results");
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

const app = express();

// Request logging middleware (helps debugging incoming requests)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health endpoint for quick readiness checks
app.get('/health', (req, res) => {
  console.log('Handling /health request');
  res.json({ status: 'ok' });
});

// Servir a pasta TesteFotos como estática
app.use('/results', express.static(path.join(__dirname, 'results')));

app.use(express.static(__dirname));

app.set("views", __dirname);
app.set("view engine", "ejs");

// MongoDB Schema
const imgSchema = new mongoose.Schema({
  name: String,
  folder: String,
  img: {
    data: Buffer,
    contentType: String
  },
  createdAt: { type: Date, default: Date.now }
});

const Image = mongoose.model("Image", imgSchema);

// Conexão com MongoDB Atlas
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("DB Connected"))
  .catch(err => console.log(err));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Admin routes: manage users (protected by ADMIN_TOKEN)
console.log('Registering admin routes...');
// List users
app.get('/admin/tbusuario', adminAuth, async (req, res) => {
  try {
    // Return all users, but do not expose cpfHash
    const users = await User.find().select('-cpfHash');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Create user (email + cpf). Only admin may create users.
app.post('/admin/tbusuario', adminAuth, async (req, res) => {
  try {
    const { email, cpf, isAdmin, active } = req.body;
    if (!email || !cpf) return res.status(400).json({ error: 'email e cpf são obrigatórios' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'E-mail já existe' });

    const saltRounds = 10;
    const cpfHash = await bcrypt.hash(cpf, saltRounds);

    const user = new User({ email, cpfHash, isAdmin: !!isAdmin, active: active !== undefined ? !!active : true });
    await user.save();
    const out = user.toObject();
    delete out.cpfHash;
    res.status(201).json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Toggle active or update user (partial)
app.patch('/admin/tbusuario/:id', adminAuth, async (req, res) => {
  try {
    const updates = {};
    if (req.body.email) updates.email = req.body.email;
    if (req.body.cpf) updates.cpfHash = await bcrypt.hash(req.body.cpf, 10);
    if (req.body.isAdmin !== undefined) updates.isAdmin = !!req.body.isAdmin;
    if (req.body.active !== undefined) updates.active = !!req.body.active;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-cpfHash');
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Delete user
app.delete('/admin/tbusuario/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// Multer para upload em memória (não salva no disco)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Página única
app.get('/', async (req, res) => {
  const folders = await Image.distinct("folder");
  res.render('index', { folders });
});

// Listar imagens de uma pasta (retorna JSON)
app.get('/folder/:folderName', async (req, res) => {
  const images = await Image.find({ folder: req.params.folderName });
  res.json(images.map(img => ({
    id: img._id,
    name: img.name,
    contentType: img.img.contentType
  })));
});

// Get imagens
app.get('/image/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if(!image) return res.sendStatus(404);
    res.contentType(image.img.contentType);
    res.send(image.img.data);
  } catch(err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Upload único ou múltiplo
app.post('/upload', upload.array('images', 20), async (req, res) => {
  let folder = req.body.folder; // pasta escolhida
  if (!folder) folder = req.body.newFolder; // criar nova pasta

  if (!req.files || req.files.length === 0) return res.send("Nenhum arquivo enviado");

  try {
    const images = req.files.map(file => ({
      name: path.parse(file.originalname).name,
      folder,
      img: { data: file.buffer, contentType: file.mimetype }
    }));

    await Image.insertMany(images);
    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.send("Erro ao salvar imagens");
  }
});

// Deletar imagem
app.delete('/delete/:id', async (req, res) => {
  try {
    await Image.findByIdAndDelete(req.params.id);
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

import { spawn } from "child_process";
import fs from "fs";

app.get("/inference/:id", async (req, res) => {
  try {
    const imageId = req.params.id;

    // Busca imagem no Mongo
    const image = await Image.findById(imageId);
    if (!image) return res.status(404).send("Imagem não encontrada");

    // Garante que a pasta temp exista
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempImagePath = path.join(tempDir, `${imageId}.jpg`);
    fs.writeFileSync(tempImagePath, image.img.data);

    // Garante que a pasta results exista
    const resultsDir = path.join(__dirname, "results", imageId);
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

    // Rodar script Python
    const py = spawn(path.join(__dirname, "venv", "Scripts", "python.exe"), [
    // const py = spawn(path.join(__dirname, "venv", "bin", "python3"), [ // Linux/Mac
      "inference_test.py",
      "--model_path", "weights_26.pt",
      "--image_path", path.join(__dirname, "temp", `${imageId}.jpg`),
      "--output_dir", resultsDir,
      "--channels", "4"
    ]);

    py.stdout.on("data", (data) => console.log(`PY: ${data}`));
    py.stderr.on("data", (data) => console.error(`PY ERR: ${data}`));

    py.on("close", (code) => {
      if (code === 0) {
        res.json({
          status: "ok",
          original: `/results/${imageId}/original.png`,
          overlay: `/results/${imageId}/overlay.png`
        });
      } else {
        res.status(500).json({ status: "erro", msg: "Falha na inferência" });
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

// Servidor
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));

