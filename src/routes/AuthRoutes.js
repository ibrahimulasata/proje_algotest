// src/routes/AuthRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/AuthController");
const { loginLimiter } = require("../middlewares/rateLimit");

router.post("/register", authController.register);           
router.post("/login", loginLimiter, authController.login);   

module.exports = router;
