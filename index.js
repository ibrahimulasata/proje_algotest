require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json()); // JSON body okumayı aç

// --- PostgreSQL bağlantısı ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// --- Root ---
app.get("/", (req, res) => {
  res.send("API çalışıyor.");
});

/* ========== AUTH (JWT) ========== */

// Bearer token doğrulama
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (!/^Bearer$/i.test(scheme) || !token) {
    return res.status(401).json({ message: "Token gerekli" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { sub, role, iat, exp }
    return next();
  } catch {
    return res.status(401).json({ message: "Token geçersiz veya süresi dolmuş" });
  }
}

// Yalnızca kendi kaydında işlem izni
function canActOnSelf(req, res, next) {
  if (String(req.user.sub) !== String(req.params.id)) {
    return res.status(403).json({ message: "Bu işlem için yetkin yok" });
  }
  next();
}

// Login: email + password -> JWT
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "email ve password zorunlu" });

    const q = `SELECT id, fullname, email, password_hash FROM users WHERE email = $1`;
    const { rows } = await pool.query(q, [String(email).trim().toLowerCase()]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Geçersiz kimlik bilgileri" });

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ message: "Geçersiz kimlik bilgileri" });

    const token = jwt.sign(
      { sub: user.id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1h" }
    );

    res.json({
      token,
      user: { id: user.id, fullname: user.fullname, email: user.email },
    });
  } catch (err) {
    console.error("POST /auth/login hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
});

/* ========== USERS ========== */

// Tüm kullanıcılar (şifresiz alanlar)
app.get("/users", async (req, res) => {
  try {
    const q = `SELECT id, fullname, email, created_at FROM users ORDER BY id`;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("GET /users hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
});

// Tek kullanıcı (ID ile)
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT id, fullname, email, created_at
      FROM users
      WHERE id = $1
    `;
    const { rows } = await pool.query(q, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /users/:id hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
});

// Yeni kullanıcı ekle (public)
app.post("/users", async (req, res) => {
  try {
    let { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      return res
        .status(400)
        .json({ message: "fullname, email, password zorunlu" });
    }
    fullname = String(fullname).trim();
    email = String(email).trim().toLowerCase();
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Şifre en az 6 karakter olmalı" });
    }

    const hash = await bcrypt.hash(password, 10);

    const insert = `
      INSERT INTO users (fullname, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, fullname, email, created_at
    `;
    const { rows } = await pool.query(insert, [fullname, email, hash]);
    return res.status(201).json(rows[0]); // 201 Created
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Bu email zaten kayıtlı" });
    }
    console.error("POST /users hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
});

// Kullanıcı güncelle (Korumalı: sadece kendi hesabı)
app.put("/users/:id", authMiddleware, canActOnSelf, async (req, res) => {
  try {
    const { id } = req.params;
    let { fullname, email, password } = req.body;

    if (!fullname && !email && !password) {
      return res.status(400).json({ message: "Güncellenecek alan yok" });
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (fullname) {
      fullname = String(fullname).trim();
      fields.push(`fullname = $${idx++}`);
      params.push(fullname);
    }

    if (email) {
      email = String(email).trim().toLowerCase();
      fields.push(`email = $${idx++}`);
      params.push(email);
    }

    if (password) {
      if (String(password).length < 6)
        return res.status(400).json({ message: "Şifre en az 6 karakter olmalı" });
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${idx++}`);
      params.push(hash);
    }

    params.push(id);
    const q = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING id, fullname, email, created_at
    `;
    const { rows } = await pool.query(q, params);

    if (rows.length === 0)
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Bu email zaten kayıtlı" });
    }
    console.error("PUT /users/:id hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
});

// Kullanıcı sil (Korumalı: sadece kendi hesabı)
app.delete("/users/:id", authMiddleware, canActOnSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const q = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const { rows } = await pool.query(q, [id]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    return res.status(204).send(); // başarılı silme
  } catch (err) {
    console.error("DELETE /users/:id hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
});

/* ========== SERVER ========== */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} üzerinde çalışıyor`);
});
