// src/routes/users.js
const express = require("express");
const Joi = require("joi");
const bcrypt = require("bcryptjs");
const { pool } = require("../db"); // ✅ pool'u doğru al
const { authMiddleware, canActOnSelf } = require("../middlewares/auth");

const router = express.Router();

/* =========================
   Joi şemaları
   ========================= */
const createUserSchema = Joi.object({
  fullname: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const updateUserSchema = Joi.object({
  fullname: Joi.string().min(3).max(100),
  email: Joi.string().email(),
  password: Joi.string().min(6),
}).min(1);

/* =========================
   Controller fonksiyonları
   ========================= */

// GET /users  → tüm kullanıcılar (şifresiz)
async function listUsers(req, res) {
  try {
    const q = `SELECT id, fullname, email, created_at FROM users ORDER BY id`;
    const { rows } = await pool.query(q);
    return res.json(rows);
  } catch (err) {
    console.error("GET /users hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
}

// GET /users/:id → tek kullanıcı
async function getUserById(req, res) {
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
    return res.json(rows[0]);
  } catch (err) {
    console.error("GET /users/:id hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
}

// POST /users → yeni kullanıcı (public)
async function createUser(req, res) {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    let { fullname, email, password } = value;
    fullname = String(fullname).trim();
    email = String(email).trim().toLowerCase();

    const hash = await bcrypt.hash(password, 10);

    const insert = `
      INSERT INTO users (fullname, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, fullname, email, created_at
    `;
    const { rows } = await pool.query(insert, [fullname, email, hash]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Bu email zaten kayıtlı" });
    }
    console.error("POST /users hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
}

// PUT /users/:id → güncelle (korumalı: sadece kendi hesabı)
async function updateUser(req, res) {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { id } = req.params;

    const fields = [];
    const params = [];
    let idx = 1;

    if (value.fullname) {
      const fullname = String(value.fullname).trim();
      fields.push(`fullname = $${idx++}`);
      params.push(fullname);
    }

    if (value.email) {
      const email = String(value.email).trim().toLowerCase();
      fields.push(`email = $${idx++}`);
      params.push(email);
    }

    if (value.password) {
      const hash = await bcrypt.hash(String(value.password), 10);
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

    if (rows.length === 0) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    return res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Bu email zaten kayıtlı" });
    }
    console.error("PUT /users/:id hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
}

// DELETE /users/:id → sil (korumalı: sadece kendi hesabı)
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const q = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const { rows } = await pool.query(q, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /users/:id hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
}

/* =========================
   Router mapping
   ========================= */
router.get("/", listUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", authMiddleware, canActOnSelf, updateUser);
router.delete("/:id", authMiddleware, canActOnSelf, deleteUser);

module.exports = router; // ✅ Router export

//burası tamamen kullanıcı verilerini yönetme kısmı , controllerdaki fonksiyonları burda  çağırıyorum.
