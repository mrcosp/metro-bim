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
import { spawn } from "child_process"; // <-- IMPORT NO TOPO

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
    console.log('✅ Health check OK');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir pastas estáticas
app.use('/results', express.static(path.join(__dirname, 'results')));
app.use(express.static(__dirname));

// Configuração do View Engine (EJS)
app.set("views", __dirname);
app.set("view engine", "ejs");

// -----------------------------------------------------
// 1. MONGODB SCHEMA (Seu schema atualizado)
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
    .then(() => console.log("✅ MongoDB conectado!"))
    .catch(err => console.error("❌ Erro ao conectar MongoDB:", err));


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
// 2. ENDPOINT DE UPLOAD DO APP ANDROID (Sua lógica de criação de pasta)
// -----------------------------------------------------
app.post('/api/captures/upload', async (req, res) => {
    console.log("--- ROTA /api/captures/upload ATINGIDA ---");
    console.log("CORPO DA REQUISIÇÃO (req.body):", req.body);
    try {
        const {
            nomeObra, pontoDeVista, descricao, criado_em,
            gps, orientacao, imageBase64,
            folder 
        } = req.body;

        // --- VALIDAÇÃO (Sua lógica) ---
        if (imageBase64) { // Se tem imagem (Android)
            if (!nomeObra) {
                return res.status(400).json({ success: false, message: "Upload de imagem (Android) requer 'nomeObra'." });
            }
            if (!folder) {
                return res.status(400).json({ success: false, message: "Upload de imagem (Android) requer 'folder'." });
            }
        } 
        else { // Se NÃO tem imagem (Web criando pasta)
            if (!folder) {
                 return res.status(400).json({ success: false, message: "Criação de pasta (Web) requer o campo 'folder'." });
            }
        }
        // --- FIM DA VALIDAÇÃO ---


        // Lógica para upload SEM imagem (Criação de pasta pela Web)
        if (!imageBase64) {
            const newFolderEntry = new Image({
                name: nomeObra || folder, 
                folder: folder.toLowerCase().trim(), 
                criado_em: new Date(criado_em || Date.now()),
                nome_da_obra: nomeObra || folder,
                descricao: descricao || 'Projeto criado (sem imagem)',
                gps: gps || {},
                orientacao: orientacao || {},
            });

            await newFolderEntry.save();
            console.log(`📁 Novo registro (sem imagem) criado: ${folder}`);
            return res.json({ success: true, message: "Registro (sem imagem) criado." });
        }

        // Lógica principal (Upload com Imagem Base64 do Android)
        
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const newCapture = new Image({
            name: nomeObra,
            folder: folder.toLowerCase().trim(), 
            criado_em: new Date(criado_em || Date.now()),
            nome_da_obra: nomeObra,
            ponto_de_vista: pontoDeVista,
            descricao: descricao,
            img: {
                data: imageBuffer,
                contentType: 'image/jpeg' 
            },
            gps: gps || {}, 
            orientacao: orientacao || {}
        });

        await newCapture.save();
        
        console.log(`✅ Novo upload do Android salvo: ${nomeObra} (Pasta: ${folder})`);
        return res.json({ success: true, message: "Captura salva com sucesso no MongoDB!" });

    } catch (err) {
        console.error("❌ Erro no /api/captures/upload:", err);
        return res.status(500).json({ success: false, message: "Erro interno do servidor durante o salvamento." });
    }
});
 

// -----------------------------------------------------
// ROTAS EXISTENTES (WEB)
// -----------------------------------------------------

// LOGIN (Sua lógica)
app.post("/login", async (req, res) => {
    try {
        const { email, cpf } = req.body; 

        if (!email || !cpf) {
            return res.status(400).json({ error: "Email e CPF são obrigatórios." });
        }

        let user = await User.findOne({ email });

        if (!user) {
            console.log("Tentativa de login com usuário não cadastrado:", email);
            return res.status(401).json({
                error: "Usuário não cadastrado. Peça para um admin cadastrar."
            });
        }

        // Verifica CPF
        const validCpf = await bcrypt.compare(cpf, user.cpfHash);
        if (!validCpf) {
            return res.status(401).json({ error: "CPF incorreto." });
        }

        // Verifica se está ativo
        if (!user.active) {
            return res.status(401).json({ error: "Usuário inativo. Contate o administrador." });
        }

        // Decide tipo de acesso
        const accessLevel = user.isAdmin ? "ADMIN" : "USUÁRIO";
        console.log(`Login bem-sucedido: ${email} (${accessLevel})`);

        // Retorna dados básicos
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

// -------------------------------------------------------------------
// ⚠️ ROTA WEB ANTIGA (CORRIGIDA PARA REACT) ⚠️ (Sua lógica de criação de pasta)
// -------------------------------------------------------------------
app.post('/upload', upload.array('images', 20), async (req, res) => {
    let folder = req.body.folder; // pasta escolhida
    if (!folder) folder = req.body.newFolder; // criar nova pasta

    // Validação
    if (!folder && (!req.files || req.files.length === 0)) {
        return res.status(400).json({ success: false, message: "Nenhum dado enviado (nem pasta, nem arquivos)." });
    }

    try {
        // --- CORREÇÃO: LÓGICA PARA CRIAR PASTA VAZIA (Web/React) ---
        if ((!req.files || req.files.length === 0) && folder) {
            
            const existing = await Image.findOne({ folder: folder.toLowerCase().trim() });
            if (existing) {
                console.log(`Pasta [${folder}] já existe.`);
                // Retorna erro 409 (Conflito) em JSON
                return res.status(409).json({ success: false, message: "Essa pasta já existe." });
            }

            const newFolderEntry = new Image({
                name: folder, // Usa o nome da pasta como nome
                folder: folder.toLowerCase().trim(),
                criado_em: new Date(),
                nome_da_obra: folder,
                descricao: 'Projeto criado via web'
            });
            await newFolderEntry.save();
            console.log(`📁 Nova pasta (web) criada: ${folder}`);
            
            // ⚠️ MUDANÇA CRÍTICA: Retorna JSON (201 Created) em vez de redirect
            return res.status(201).json({ success: true, message: "Pasta criada com sucesso." });
        }

        // --- LÓGICA ANTIGA (Se houver arquivos) ---
        const images = req.files.map(file => ({
            name: path.parse(file.originalname).name,
            folder: folder.toLowerCase().trim(), // Limpa o nome da pasta
            img: { data: file.buffer, contentType: file.mimetype }
        }));

        await Image.insertMany(images);
        
        // ⚠️ MUDANÇA CRÍTICA: Retorna JSON (201 Created) em vez de redirect
        return res.status(201).json({ success: true, message: "Imagens salvas com sucesso." });

    } catch (err) {
        console.log("Erro no /upload:", err);
        // Retorna Erro 500 em JSON
        return res.status(500).json({ success: false, message: "Erro ao salvar dados" });
    }
});

// Deletar imagem (Web)
app.delete('/delete/:id', async (req, res) => {
    try {
        await Image.findByIdAndDelete(req.params.id);
        res.sendStatus(200); // OK para React/Fetch
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Erro ao deletar imagem' });
    }
});

// --- ROTA DE INFERÊNCIA SUBSTITUÍDA ---
// (Esta é a rota da Fase 4, com a lógica de IA+BIM)
app.post("/inference/:id", async (req, res) => {
    try {
        const imageId = req.params.id;

        // 1. Busca a imagem E SEUS METADADOS (incluindo a 'folder')
        const image = await Image.findById(imageId);
        if (!image || !image.img || !image.img.data) {
            return res.status(404).send("Imagem não encontrada ou sem dados binários");
        }

        // --- 2. PEGAR A 'AREA' (ZONA) ---
        // Puxa o 'folder' (ex: "plataforma") do registro do MongoDB
        // e limpa (lowercase, trim)
        const areaNome = image.folder ? image.folder.toLowerCase().trim() : null; 
        
        if (!areaNome) {
            // Se a imagem não tem um 'folder', não podemos calcular o progresso
            return res.status(400).json({ 
                error: `Imagem ${imageId} não tem uma 'folder' (área) definida. Não é possível calcular o progresso.` 
            });
        }

        // 3. Salva a imagem em um arquivo temporário (Sua lógica)
        const tempDir = path.join(__dirname, "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempImagePath = path.join(tempDir, `${imageId}.jpg`);
        fs.writeFileSync(tempImagePath, image.img.data);

        // 4. Prepara a pasta de saída (Sua lógica)
        const resultsDir = path.join(__dirname, "results", imageId);
        if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

        // 5. Rodar script Python (MODIFICADO)
        const py = spawn("python", [
            "inference_test.py", // O seu script que acabamos de modificar
            "--model_path", "Var_2plus_weights_28.Pt", // <-- CORRIGIDO PARA O SEU MODELO
            "--image_path", tempImagePath,
            "--output_dir", resultsDir,
            "--channels", "4",
            "--area", areaNome // <-- 6. PASSANDO A 'AREA' PARA O PYTHON
        ]);

        // --- 7. CAPTURAR A SAÍDA (MODIFICADO) ---
        let jsonData = '';
        let pyError = '';

        // O Python vai imprimir logs no stderr
        py.stderr.on("data", (data) => {
            console.error(`PY ERR: ${data}`); // Loga o erro
            pyError += data.toString(); // Salva para o caso de falha
        });
        
        // O Python vai imprimir o JSON de resultado no stdout
        py.stdout.on("data", (data) => {
            console.log(`PY: ${data}`); // Loga o sucesso
            jsonData += data.toString();
        });

        py.on("close", (code) => {
            // Limpa o arquivo temporário
            fs.unlink(tempImagePath, (err) => { 
                if (err) console.error("Erro ao limpar temp file:", err);
            });

            // Se o código for 0 E o jsonData (stdout) não estiver vazio
            if (code === 0 && jsonData) {
                try {
                    // Tenta parsear o JSON de sucesso
                    const resultadoFinal = JSON.parse(jsonData);
                    
                    if(resultadoFinal.error) {
                         // Ocorreu um erro no Python (ex: "Nenhum material detectado")
                         // mas ainda queremos retornar 200 OK com o overlay
                         console.warn(`Aviso na inferência (mas overlay OK): ${resultadoFinal.error}`);
                         res.json(resultadoFinal); // Envia o JSON com o erro e o overlay
                    } else {
                         // SUCESSO TOTAL!
                         console.log(`Inferência para [${areaNome}] concluída. Progresso: ${resultadoFinal.porcentagem_geral}%`);
                         res.json(resultadoFinal); // Envia o JSON com percentual
                    }
                    
                } catch (e) {
                    // Falha ao parsear o JSON de sucesso (improvável)
                    console.error("Falha ao parsear stdout do Python:", e);
                    res.status(500).json({ error: "Falha ao processar resposta da IA", details: jsonData });
                }
            } else {
                // Falha crítica (código != 0 ou pyError)
                res.status(500).json({ error: "Falha crítica na inferência Python", details: pyError });
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
 

// --- ROTA NOVA ADICIONADA (PARA O REACT LER O PROGRESSO) ---
app.get('/api/progress/:area', (req, res) => {
    const areaNome = req.params.area.toLowerCase(); // Ex: 'plataforma'
    
    const progressoPath = path.join(__dirname, `progresso_${areaNome}.json`);
    const planoPath = path.join(__dirname, `plano_base_${areaNome}.json`);
    
    // Primeiro, verifica se o plano existe
    if (!fs.existsSync(planoPath)) {
        return res.status(404).json({ error: `Plano base 'plano_base_${areaNome}.json' não encontrado.`});
    }

    try {
        // Se chegou aqui, o plano existe.
        const planoData = fs.readFileSync(planoPath, 'utf8');
        const plano = JSON.parse(planoData);
        
        let progresso = {};
        let total_executado = 0;

        // Agora, verifica se o progresso existe
        if (fs.existsSync(progressoPath)) {
             const progressoData = fs.readFileSync(progressoPath, 'utf8');
             progresso = JSON.parse(progressoData);
             total_executado = progresso.elementos_executados_geral || 0;
        } else {
            // Progresso não existe, então está 0%
            progresso = { elementos_executados_geral: 0 };
        }
            
        const total_planejado = plano.total_elementos_geral || 1; // Evita divisão por zero
        const percentual_geral = (total_executado / total_planejado) * 100;

        res.json({
           area_inspecionada: areaNome,
           porcentagem_geral: round(percentual_geral, 2),
           total_executado: total_executado,
           total_planejado: plano.total_elementos_geral || 0,
           detalhes_executados: progresso,
           detalhes_plano: plano
        });

    } catch (err) {
         res.status(500).json({ error: 'Falha ao ler arquivos de progresso', details: err.message });
    }
});

// --- FUNÇÃO HELPER ADICIONADA ---
function round(value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}


// Servidor
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));