// src/controllers/QuestionsController.js
const Joi = require("joi");
const { pool } = require("../db");

const createSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().allow("", null),
});

async function listQuestions(req, res) {
  try {
    const q = `SELECT id, title, description, created_by, created_at FROM questions ORDER BY id DESC`;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("GET /questions hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

async function getQuestion(req, res) {
  try {
    const { id } = req.params;
    const q1 = `SELECT id, title, description, created_by, created_at FROM questions WHERE id = $1`;
    const { rows } = await pool.query(q1, [id]);
    if (!rows.length) return res.status(404).json({ message: "Soru bulunamadı" });

    const q2 = `SELECT id, answer, created_by, created_at FROM answers WHERE question_id = $1 ORDER BY id ASC`;
    const ans = await pool.query(q2, [id]);

    res.json({ ...rows[0], answers: ans.rows });
  } catch (err) {
    console.error("GET /questions/:id hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

async function createQuestion(req, res) {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const createdBy = req.user?.sub || null;
    const q = `
      INSERT INTO questions (title, description, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, title, description, created_by, created_at
    `;
    const { rows } = await pool.query(q, [value.title.trim(), (value.description || "").trim(), createdBy]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /questions hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

module.exports = { listQuestions, getQuestion, createQuestion };
