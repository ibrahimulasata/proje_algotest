// src/controllers/AuthController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { pool } = require("../db");

// REGISTER
const registerSchema = Joi.object({
  fullname: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

async function register(req, res) {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ message: error.details[0].message });

    let { fullname, email, password } = value;
    fullname = String(fullname).trim();
    email = String(email).trim().toLowerCase();

    const hash = await bcrypt.hash(password, 12);
    const q = `
      INSERT INTO users (fullname, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, fullname, email, created_at
    `;
    const { rows } = await pool.query(q, [fullname, email, hash]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Bu email zaten kayıtlı" });
    console.error("POST /auth/register hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
}

// LOGIN
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required(),
});

async function login(req, res) {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const email = String(value.email).trim().toLowerCase();
    const password = String(value.password);

    const q = `SELECT id, fullname, email, password_hash, role FROM users WHERE email = $1`;
    const { rows } = await pool.query(q, [email]);
    if (!rows.length) return res.status(401).json({ message: "Geçersiz kimlik bilgileri" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Geçersiz kimlik bilgileri" });

    const expires = process.env.JWT_EXPIRES || "1h";
    const token = jwt.sign({ sub: user.id, role: user.role || "user" }, process.env.JWT_SECRET, { expiresIn: expires });

    return res.json({
      token,
      user: { id: user.id, fullname: user.fullname, email: user.email, role: user.role || "user" },
      expiresIn: expires,
    });
  } catch (err) {
    console.error("POST /auth/login hata:", err);
    return res.status(500).json({ message: "Server hatası" });
  }
}

module.exports = { register, login };
