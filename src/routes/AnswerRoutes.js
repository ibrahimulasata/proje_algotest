// src/routes/AnswerRoutes.js
const express = require("express");
const router = express.Router({ mergeParams: true });

const { listAnswers, createAnswer } = require("../controllers/AnswersController");
const { authMiddleware } = require("../middlewares/auth");
const validateId = require("../middlewares/validateId");

// /questions/:id/answers
router.get("/:id/answers", validateId, listAnswers);
router.post("/:id/answers", validateId, authMiddleware, createAnswer);

module.exports = router;
