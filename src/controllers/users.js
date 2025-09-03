// src/controllers/users.js
const bcrypt = require("bcryptjs");
const { pool } = require("../db");

// GET /users
async function listUsers(req, res) {
  try {
    const q = `SELECT id, fullname, email, created_at FROM users ORDER BY id`;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("GET /users hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

// GET /users/:id
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
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /users/:id hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

// POST /users
async function createUser(req, res) {
  try {
    let { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({ message: "fullname, email, password zorunlu" });
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
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Bu email zaten kayıtlı" });
    }
    console.error("POST /users hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
}

// PUT /users/:id
async function updateUser(req, res) {
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

// DELETE /users/:id
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

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
