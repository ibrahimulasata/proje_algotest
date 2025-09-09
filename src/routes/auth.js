// src/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { pool } = require("../db");
const { loginLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required(), // boş şifreyi engelle
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, password } = value;

    const q = `
      SELECT id, fullname, email, password_hash
      FROM users
      WHERE email = $1
    `;
    const { rows } = await pool.query(q, [String(email).trim().toLowerCase()]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Geçersiz kimlik bilgileri" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Geçersiz kimlik bilgileri" });
    }

    const token = jwt.sign(
      { sub: user.id, role: "user" }, // İleride admin rolü eklenebilir
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

module.exports = router;

//amaç kullanıcı girişini  yapmak ve JWT token üretmek, burada login endpoint’in var
