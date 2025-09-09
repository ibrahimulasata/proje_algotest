// src/controllers/users.js
const Joi = require("joi");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");

// ---- Joi şemaları ----
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

// ---- Controller fonksiyonları ----
async function listUsers(req, res) {
  try {
    // Admin değilse email paylaşmıyoruz (PII azaltma)
    const select =
      req.user?.role === "admin"
        ? "id, fullname, email, created_at"
        : "id, fullname, created_at";

    const q = `SELECT ${select} FROM users ORDER BY id`;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("GET /users hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const q = `
      SELECT id, fullname, email, created_at
      FROM users
      WHERE id = $1
    `;
    const { rows } = await pool.query(q, [id]);
    if (!rows.length) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    const isAdmin = req.user?.role === "admin";
    const isSelf = String(req.user?.sub) === String(id);
    const user = rows[0];

    if (!isAdmin && !isSelf) {
      delete user.email; // başkasının email'ini sızdırma
    }

    res.json(user);
  } catch (err) {
    console.error("GET /users/:id hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

async function createUser(req, res) {
  try {
    const { error, value } = createUserSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ message: error.details[0].message });

    let { fullname, email, password } = value;
    fullname = String(fullname).trim();
    email = String(email).trim().toLowerCase();

    const hash = await bcrypt.hash(password, 12); // bir tık daha güçlü

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

async function updateUser(req, res) {
  try {
    const { error, value } = updateUserSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { id } = req.params;

    const fields = [];
    const params = [];
    let idx = 1;

    if (value.fullname) {
      fields.push(`fullname = $${idx++}`);
      params.push(String(value.fullname).trim());
    }
    if (value.email) {
      fields.push(`email = $${idx++}`);
      params.push(String(value.email).trim().toLowerCase());
    }
    if (value.password) {
      fields.push(`password_hash = $${idx++}`);
      params.push(await bcrypt.hash(String(value.password), 12));
    }

    params.push(id);

    const q = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING id, fullname, email, created_at
    `;
    const { rows } = await pool.query(q, params);
    if (!rows.length) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Bu email zaten kayıtlı" });
    }
    console.error("PUT /users/:id hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const q = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const { rows } = await pool.query(q, [id]);
    if (!rows.length) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /users/:id hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };

//her endpointin arkasındaki iş mantığı (DB sorguları vs.).