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
import cors from 'cors';
import fs from "fs"; 

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resultsDir = path.join(__dirname, "results");
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

const app = express();

// Middleware de log de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Endpoint de verificação de saúde
app.get('/health', (req, res) => {
    console.log('Health check OK');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir pastas estáticas
app.use('/results', express.static(path.join(__dirname, 'results')));
app.use(express.static(__dirname));

// Configuração do View Engine (EJS)
app.set("views", __dirname);
app.set("view engine", "ejs");

// -----------------------------------------------------
// 1. MONGODB SCHEMA (Atualizado para Android e Web)
// -----------------------------------------------------
const imgSchema = new mongoose.Schema({
    // Campos da UI Web e Android
    name: String, // Usado para Nome da Obra
    folder: String, // Usado para a pasta (Ex: 'android-upload' ou o nome da pasta)
    
    // NOVOS CAMPOS DE METADADOS DO ANDROID
    nome_da_obra: String,
    ponto_de_vista: String,
    descricao: String,
    
    // Dados de GPS
    gps: {
        latitude: Number,
        longitude: Number,
        altitude_metros: Number,
        precisao_metros: Number,
        status: String 
    },
    // Dados de Orientação (AR)
    orientacao: {
        azimute_graus: Number,
        pitch_graus: Number,
        roll_graus: Number
    },

    // Campo de Imagem Binária (Onde a foto é salva)
    img: {
        data: Buffer, 
        contentType: String
    },
    // Campo 'criado_em' do Android (tipo Date)
    criado_em: Date,
    // Campo 'createdAt' padrão (tipo Date, gerenciado pelo Mongoose/DB)
    createdAt: { type: Date, default: Date.now }
});

const Image = mongoose.model("Image", imgSchema);

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("MongoDB conectado!"))
    .catch(err => console.error("Erro ao conectar MongoDB:", err));


// Configuração do CORS (Permite requisições locais)
app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:3000'], // Adicione outras origens se necessário
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token']
}));

// Aumentar o limite de tamanho do corpo da requisição para Base64 (Imagens)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -----------------------------------------------------
// 2. ENDPOINT DE UPLOAD DO APP ANDROID (API REST)
// (Aceita 'folder' do Android)
// -----------------------------------------------------
app.post('/api/captures/upload', async (req, res) => {
    try {
        const {
            nomeObra, pontoDeVista, descricao, criado_em,
            gps, orientacao, imageBase64,
            folder // <-- 1. RECEBENDO O CAMPO 'folder' DO ANDROID
        } = req.body;

        if (!nomeObra) {
            return res.status(400).json({ success: false, message: "Campo 'nomeObra' é obrigatório." });
        }
        
        if (!folder) {
             return res.status(400).json({ success: false, message: "Campo 'folder' é obrigatório." });
        }

        // Lógica para upload SEM imagem (se o Android enviar)
        if (!imageBase64) {
            const newFolderEntry = new Image({
                name: nomeObra,
                folder: folder.toLowerCase().trim(), // Limpa o nome da pasta
                criado_em: new Date(criado_em || Date.now()),
                nome_da_obra: nomeObra,
                descricao: descricao || 'Projeto criado (sem imagem)',
                gps: gps || {},
                orientacao: orientacao || {},
            });

            await newFolderEntry.save();
            console.log(`📁 Novo registro (sem imagem) criado: ${nomeObra}`);
            return res.json({ success: true, message: "Registro (sem imagem) criado." });
        }

        // Lógica principal (Upload com Imagem Base64)
        
        // 1. Converte Base64 para Buffer binário
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // 2. Cria o novo documento Mongoose
        const newCapture = new Image({
            name: nomeObra,
            // 2. ⚠️ CORREÇÃO: Usa o 'folder' enviado pelo app (limpo)
            folder: folder.toLowerCase().trim(), 
            criado_em: new Date(criado_em || Date.now()),
            
            nome_da_obra: nomeObra,
            ponto_de_vista: pontoDeVista,
            descricao: descricao,
            
            img: {
                data: imageBuffer,
                contentType: 'image/jpeg' 
            },
            
            gps: gps || {}, // Fallback para objetos vazios
            orientacao: orientacao || {} // Fallback para objetos vazios
        });

        // 3. Salva no MongoDB
        await newCapture.save();
        
        console.log(`Novo upload do Android salvo: ${nomeObra} (Pasta: ${folder})`);
        return res.json({ success: true, message: "Captura salva com sucesso no MongoDB!" });

    } catch (err) {
        console.error("Erro no /api/captures/upload:", err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor durante o salvamento." });
    }
});
 

// -----------------------------------------------------
// ROTAS EXISTENTES (WEB)
// -----------------------------------------------------

// LOGIN (LÓGICA CORRIGIDA)
app.post("/login", async (req, res) => {
    try {
        const { email, cpf, adminLogin } = req.body; 

        if (!email || !cpf) {
            return res.status(400).json({ error: "Email e CPF são obrigatórios." });
        }

        let user = await User.findOne({ email });

        if (!user) {
            // Lógica de autocadastro do Admin
            if (adminLogin) {
                console.log('Criando novo usuário admin...');
                const cpfHash = await bcrypt.hash(cpf, 10);
                user = new User({
                    email,
                    cpfHash,
                    isAdmin: true,
                    active: true
                });
                await user.save();
                console.log('Novo usuário admin criado com sucesso');
            } else {
                console.log("Tentativa de login com usuário não cadastrado:", email);
                return res.status(401).json({
                    error: "Usuário não cadastrado. Peça para um admin cadastrar."
                });
            }
        }

        // Verifica CPF
        const validCpf = await bcrypt.compare(cpf, user.cpfHash);
        if (!validCpf) {
            // ⚠️ CORREÇÃO AQUI: Mensagem de erro correta
            return res.status(401).json({ error: "CPF incorreto." });
        }

        // Verifica se está ativo
        if (!user.active) {
            return res.status(401).json({ error: "Usuário inativo. Contate o administrador." });
        }

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
        // Validação de permissão
        if (adminLogin && !user.isAdmin) {
            return res.status(403).json({
                error: "Você não tem permissão de administrador."
            });
        }
        if (!adminLogin && user.isAdmin) {
             return res.status(403).json({
                error: "Admins devem entrar como administradores."
            });
        }

        // Decide tipo de acesso
        const accessLevel = user.isAdmin ? "ADMIN" : "USUÁRIO";
        console.log(`Login bem-sucedido: ${email} (${accessLevel})`);

        // Retorna dados básicos
=======
        // 5. Decide tipo de acesso
        const accessLevel = user.isAdmin ? "ADMIN" : "USUÁRIO";
        console.log(`Login bem-sucedido: ${email} (${accessLevel})`);

        // 6. Retorna dados básicos (incluindo se é admin)
>>>>>>> Stashed changes
=======
        // 5. Decide tipo de acesso
        const accessLevel = user.isAdmin ? "ADMIN" : "USUÁRIO";
        console.log(`Login bem-sucedido: ${email} (${accessLevel})`);

        // 6. Retorna dados básicos (incluindo se é admin)
>>>>>>> Stashed changes
=======
        // 5. Decide tipo de acesso
        const accessLevel = user.isAdmin ? "ADMIN" : "USUÁRIO";
        console.log(`Login bem-sucedido: ${email} (${accessLevel})`);

        // 6. Retorna dados básicos (incluindo se é admin)
>>>>>>> Stashed changes
        return res.json({
            ok: true,
            email: user.email,
            isAdmin: user.isAdmin
        });

    } catch (err) {
        console.error("Erro no /login:", err);
        return res.status(500).json({ error: "Erro no servidor durante o login." });
    }
});


// Rotas Admin (Protegidas)
console.log('Registering admin routes...');
app.get('/admin/tbusuario', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-cpfHash');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

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

// Configuração do Multer (Upload de arquivos pela Web)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Página única (Web EJS)
app.get('/', async (req, res) => {
    const folders = await Image.distinct("folder");
    res.render('index', { folders });
});

// Listar imagens de uma pasta (JSON para Web)
app.get('/folder/:folderName', async (req, res) => {
    try {
        const images = await Image.find({ folder: req.params.folderName });

        const formatted = images.map(img => ({
            id: img._id,
            nome_da_obra: img.nome_da_obra,
            descricao: img.descricao,
            criado_em: img.createdAt,
            contentType: img.img?.contentType, 
            base64: img.img?.data
                ? `data:${img.img.contentType};base64,${img.img.data.toString('base64')}`
                : null
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar imagens.' });
    }
});


// Get imagens (renderização direta da imagem binária)
app.get('/image/:id', async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        if(!image || !image.img || !image.img.data) return res.sendStatus(404);
        res.contentType(image.img.contentType);
        res.send(image.img.data);
    } catch(err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// Upload único ou múltiplo 
app.post('/upload', upload.array('images', 20), async (req, res) => {
    let folder = req.body.folder; 
    if (!folder) folder = req.body.newFolder; 

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

// Deletar imagem (Web)
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

// Rota de Inferência (Python)
app.post("/inference/:id", async (req, res) => {
    try {
        const imageId = req.params.id;

        const image = await Image.findById(imageId);
        if (!image || !image.img || !image.img.data) {
             return res.status(404).send("Imagem não encontrada ou sem dados binários");
        }

        const tempDir = path.join(__dirname, "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempImagePath = path.join(tempDir, `${imageId}.jpg`);
        fs.writeFileSync(tempImagePath, image.img.data);

        const resultsDir = path.join(__dirname, "results", imageId);
        if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

        // Rodar script Python
        const py = spawn("python", [
          "inference_test.py",
          "--model_path", "var_3plus_weights_30.pt",
          "--image_path", tempImagePath,
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

// Rota para listar pastas únicas (Web e Android)
app.get('/api/folders', async (req, res) => {
    try {
        // Encontra todos os nomes de pastas únicos, filtrando nulos ou vazios
        const folders = await Image.distinct("folder", { 
            folder: { $exists: true, $ne: null, $ne: "" } 
        });
 
        const foldersData = await Promise.all(folders.map(async (folderName) => {
            const lastImage = await Image.findOne({ folder: folderName })
                .sort({ createdAt: -1 });
            return {
                name: folderName,
                date: lastImage ? lastImage.createdAt : new Date(),
                preview: '📁',
                type: 'folder'
            };
        }));
 
        res.json(foldersData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar pastas' });
    }
});
 

// Servidor
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));