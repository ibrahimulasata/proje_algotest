// src/routes/QuestionRoutes.js
const express = require("express");
const router = express.Router();

const { listQuestions, getQuestion, createQuestion } = require("../controllers/QuestionsController");
const { authMiddleware } = require("../middlewares/auth");
const validateId = require("../middlewares/validateId");

router.get("/", listQuestions);
router.get("/:id", validateId, getQuestion);
router.post("/", authMiddleware, createQuestion);

module.exports = router;
