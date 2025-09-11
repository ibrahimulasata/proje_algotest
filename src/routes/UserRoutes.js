// src/routes/UserRoutes.js
const express = require("express");
const router = express.Router();

const { listUsers, getUserById, updateUser, deleteUser } = require("../controllers/UsersController");
const { authMiddleware, requireSelfOrAdmin, requireAdmin } = require("../middlewares/auth");
const validateId = require("../middlewares/validateId");

// liste: sadece admin
router.get("/", authMiddleware, requireAdmin, listUsers);

// tek kullanıcı: kendisi veya admin
router.get("/:id", authMiddleware, validateId, requireSelfOrAdmin, getUserById);

// update/delete: kendisi veya admin
router.put("/:id", authMiddleware, validateId, requireSelfOrAdmin, updateUser);
router.delete("/:id", authMiddleware, validateId, requireSelfOrAdmin, deleteUser);

module.exports = router;
