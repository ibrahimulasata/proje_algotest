// src/controllers/AnswersController.js
const Joi = require("joi");
const { pool } = require("../db");

const createAnswerSchema = Joi.object({
  answer: Joi.string().min(1).required(),
});

async function listAnswers(req, res) {
  try {
    const { id } = req.params; // question_id
    const q = `SELECT id, answer, created_by, created_at FROM answers WHERE question_id = $1 ORDER BY id ASC`;
    const { rows } = await pool.query(q, [id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /questions/:id/answers hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

async function createAnswer(req, res) {
  try {
    const { id } = req.params; // question_id
    const { error, value } = createAnswerSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const createdBy = req.user?.sub || null;
    const q = `
      INSERT INTO answers (question_id, answer, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, answer, created_by, created_at
    `;
    const { rows } = await pool.query(q, [id, value.answer.trim(), createdBy]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /questions/:id/answers hata:", err);
    res.status(500).json({ message: "Server hatası" });
  }
}

module.exports = { listAnswers, createAnswer };
