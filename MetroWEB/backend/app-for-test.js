import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

// BD FAKE EM MEMÓRIA (só em testes)
const users = [];
let images = [
  { id: 1, url: "img1.png" },
  { id: 2, url: "img2.png" }
];

// LOGGER (igual ao server.js)

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// GET /images
app.get("/images", (req, res) => {
  return res.status(200).json(images);
});

// POST /register
app.post("/register", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "faltando dados" });
  }

  // verificar duplicado
  const exist = users.find(u => u.email === email);
  if (exist) {
    return res.status(409).json({ error: "email duplicado" });
  }

  const hash = await bcrypt.hash(senha, 10);

  users.push({
    id: users.length + 1,
    email,
    senhaHash: hash
  });

  return res.status(201).json({ ok: true });
});

// POST /login
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: "email não existe" });

  const ok = await bcrypt.compare(senha, user.senhaHash);
  if (!ok) return res.status(401).json({ error: "senha incorreta" });

  const token = jwt.sign({ id: user.id, email: user.email }, "segredo", {
    expiresIn: "1h"
  });

  return res.status(200).json({ token });
});

// Middleware de autenticação
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "token ausente" });

  const token = h.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, "segredo");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "token inválido" });
  }
}

// GET /me (rota protegida)
app.get("/me", auth, (req, res) => {
  return res.status(200).json({
    email: req.user.email
  });
});

app.get("/error-test", (req, res, next) => {
  next(new Error("Erro simulado"));
});

app.use((err, req, res, next) => {
  console.log("MIDDLEWARE DE ERRO PEGOU:", err.message);
  res.status(500).json({ error: "Erro interno do servidor" });
});

export default app;
