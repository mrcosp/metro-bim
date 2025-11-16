import request from "supertest";
import bcrypt from "bcryptjs";
import app from "./app-for-test.js";

// TESTES DE INTEGRAÇÃO (Rotas reais usando Supertest)

describe("API - Testes de Integração", () => {
  // GET /images 
  test("GET /images retorna array", async () => {
    const res = await request(app).get("/images");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("url");
    }
  });

  test("GET /images retorna Content-Type JSON", async () => {
    const res = await request(app).get("/images");
    expect(res.headers['content-type']).toMatch(/json/);
  });

  // POST /register 
  test("POST /register cria usuário", async () => {
    const res = await request(app)
      .post("/register")
      .send({ email: "a@a.com", senha: "123" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("ok", true);
  });

  test("POST /register falha com dados faltando (sem email)", async () => {
    const res = await request(app)
      .post("/register")
      .send({ senha: "123" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /register falha com dados faltando (sem senha)", async () => {
    const res = await request(app)
      .post("/register")
      .send({ email: "incompleto@x.com" });

    expect(res.statusCode).toBe(400); 
    expect(res.body).toHaveProperty("error");
  });

  test("POST /register falha com email duplicado", async () => {
    await request(app)
      .post("/register")
      .send({ email: "dup@a.com", senha: "abc" });

    const res2 = await request(app)
      .post("/register")
      .send({ email: "dup@a.com", senha: "abc" });

    expect([400, 409]).toContain(res2.statusCode);
    expect(res2.body).toHaveProperty("error");
  });

  test("POST /register com email vazio retorna erro", async () => {
    const res = await request(app)
      .post("/register")
      .send({ email: "", senha: "123" });

    expect(res.statusCode).toBe(400);
  });

  test("POST /register com senha vazia retorna erro", async () => {
    const res = await request(app)
      .post("/register")
      .send({ email: "test@test.com", senha: "" });

    expect(res.statusCode).toBe(400);
  });

  // POST /login
  test("POST /login retorna erro para usuário inexistente", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "naoexiste@x.com", senha: "123" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /login retorna erro para senha inválida", async () => {
    await request(app)
      .post("/register")
      .send({ email: "login@x.com", senha: "123" });

    const res = await request(app)
      .post("/login")
      .send({ email: "login@x.com", senha: "errada" });

    expect([400, 401]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /login retorna token no sucesso", async () => {
    await request(app)
      .post("/register")
      .send({ email: "token@x.com", senha: "123" });

    const res = await request(app)
      .post("/login")
      .send({ email: "token@x.com", senha: "123" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  test("POST /login falha com dados faltando", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "test@test.com" });

    expect([400, 401]).toContain(res.statusCode);
  });

  test("POST /login com email inexistente retorna 400", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "nuncacriado@test.com", senha: "123" });

    expect(res.statusCode).toBe(400);
  });
});

// TESTES DE AUTENTICAÇÃO E AUTORIZAÇÃO

describe("API - Autenticação e Autorização", () => {
  let validToken;

  beforeAll(async () => {
    // Cria usuário e pega token válido
    await request(app)
      .post("/register")
      .send({ email: "auth@test.com", senha: "senha123" });

    const loginRes = await request(app)
      .post("/login")
      .send({ email: "auth@test.com", senha: "senha123" });

    validToken = loginRes.body.token;
  });

  test("GET /me sem token retorna 401", async () => {
    const res = await request(app).get("/me");
    
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  test("GET /me com token inválido retorna 401", async () => {
    const res = await request(app)
      .get("/me")
      .set("Authorization", "Bearer tokeninvalido123");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  test("GET /me com token malformado retorna 401", async () => {
    const res = await request(app)
      .get("/me")
      .set("Authorization", "InvalidFormat token123");

    expect(res.statusCode).toBe(401);
  });

  test("GET /me com token válido retorna dados do usuário", async () => {
    const res = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("email", "auth@test.com");
  });
});

// TESTES DE FLUXO COMPLETO

describe("API - Fluxo Completo", () => {
  test("Registro → Login → /me (rota protegida)", async () => {
    // 1. Registrar
    const registerRes = await request(app)
      .post("/register")
      .send({ email: "flow@test.com", senha: "123" });

    expect(registerRes.statusCode).toBe(201);

    // 2. Login
    const login = await request(app)
      .post("/login")
      .send({ email: "flow@test.com", senha: "123" });

    expect(login.statusCode).toBe(200);
    expect(login.body).toHaveProperty("token");

    const token = login.body.token;

    // 3. Acessar rota protegida
    const res = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("email");
    expect(res.body.email).toBe("flow@test.com");
  });

  test("Registro → Login com senha errada → Falha", async () => {
    await request(app)
      .post("/register")
      .send({ email: "flowerror@test.com", senha: "correta" });

    const res = await request(app)
      .post("/login")
      .send({ email: "flowerror@test.com", senha: "errada" });

    expect(res.statusCode).toBe(401);
  });

  test("Registro → Tentar registrar novamente → Erro 409", async () => {
    const email = "duplicate@test.com";
    
    await request(app)
      .post("/register")
      .send({ email, senha: "123" });

    const res = await request(app)
      .post("/register")
      .send({ email, senha: "456" });

    expect(res.statusCode).toBe(409);
  });
});

// TESTES UNITÁRIOS (Só lógica — sem Express)

describe("Unitário - Criptografia", () => {
  test("hash deve ser diferente da senha original", async () => {
    const senha = "123456";
    const hash = await bcrypt.hash(senha, 10);
    expect(hash).not.toBe(senha);
    expect(hash.length).toBeGreaterThan(senha.length);
  });

  test("bcrypt.compare deve retornar true para senha correta", async () => {
    const senha = "abc123";
    const hash = await bcrypt.hash(senha, 10);

    const match = await bcrypt.compare("abc123", hash);
    expect(match).toBe(true);
  });

  test("bcrypt.compare deve retornar false para senha errada", async () => {
    const senha = "abc123";
    const hash = await bcrypt.hash(senha, 10);

    const match = await bcrypt.compare("errada", hash);
    expect(match).toBe(false);
  });

  test("hash com diferentes salt rounds deve gerar hashes diferentes", async () => {
    const senha = "test123";
    const hash1 = await bcrypt.hash(senha, 10);
    const hash2 = await bcrypt.hash(senha, 10);
    
    // Mesmo com mesma senha, hashes são diferentes (salt aleatório)
    expect(hash1).not.toBe(hash2);
    
    // Mas ambos validam a senha
    expect(await bcrypt.compare(senha, hash1)).toBe(true);
    expect(await bcrypt.compare(senha, hash2)).toBe(true);
  });

  test("bcrypt.compare com string vazia retorna false", async () => {
    const senha = "abc123";
    const hash = await bcrypt.hash(senha, 10);

    const match = await bcrypt.compare("", hash);
    expect(match).toBe(false);
  });
});

// TESTE DE ERRO INTERNO 500

describe("API - Teste de Erro Interno 500", () => {
  test("força erro interno simulando falha", async () => {
    const res = await request(app).get("/error-test");

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("error");
  });
});

// TESTES DE CASOS EXTREMOS (Edge Cases)

describe("API - Edge Cases", () => {
  test("POST /register com email muito longo", async () => {
    const longEmail = "a".repeat(300) + "@test.com";
    const res = await request(app)
      .post("/register")
      .send({ email: longEmail, senha: "123" });

    // Deve aceitar ou rejeitar de forma controlada
    expect([201, 400]).toContain(res.statusCode);
  });

  test("POST /register com senha muito longa", async () => {
    const longPassword = "a".repeat(1000);
    const res = await request(app)
      .post("/register")
      .send({ email: "longpass@test.com", senha: longPassword });

    expect(res.statusCode).toBe(201);
  });

  test("POST /login com caracteres especiais no email", async () => {
    const specialEmail = "test+special@test.com";
    
    await request(app)
      .post("/register")
      .send({ email: specialEmail, senha: "123" });

    const res = await request(app)
      .post("/login")
      .send({ email: specialEmail, senha: "123" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("GET /me com múltiplos espaços no Bearer token", async () => {
    const res = await request(app)
      .get("/me")
      .set("Authorization", "Bearer    token123");

    expect(res.statusCode).toBe(401);
  });
});

// TESTES DE HEADERS E RESPOSTA

describe("API - Headers e Metadados", () => {
  test("Todas as rotas retornam Content-Type correto", async () => {
    const routes = [
      { method: 'get', path: '/images' },
      { method: 'post', path: '/register', body: { email: "header@test.com", senha: "123" } }
    ];

    for (const route of routes) {
      const res = await request(app)[route.method](route.path)
        .send(route.body || {});
      
      expect(res.headers['content-type']).toMatch(/json/);
    }
  });
});

// TESTES DE SEGURANÇA

describe("API - Segurança", () => {
  test("Senha não deve aparecer em log ou resposta", async () => {
    const res = await request(app)
      .post("/register")
      .send({ email: "secure@test.com", senha: "senhasecreta123" });

    const responseString = JSON.stringify(res.body);
    expect(responseString).not.toContain("senhasecreta123");
  });

  test("Hash de senha deve ter formato bcrypt válido", async () => {
    const senha = "test123";
    const hash = await bcrypt.hash(senha, 10);
    
    // Hash bcrypt começa com $2a$, $2b$ ou $2y$
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  test("Token JWT deve ter 3 partes separadas por pontos", async () => {
    await request(app)
      .post("/register")
      .send({ email: "jwt@test.com", senha: "123" });

    const res = await request(app)
      .post("/login")
      .send({ email: "jwt@test.com", senha: "123" });

    const token = res.body.token;
    const parts = token.split('.');
    
    expect(parts.length).toBe(3);
  });
});