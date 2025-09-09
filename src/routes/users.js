// src/routes/users.js
const express = require("express");
const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/users");
const {
  authMiddleware,
  requireSelfOrAdmin,
  requireAdmin,
} = require("../middlewares/auth");
const validateId = require("../middlewares/validateId");

const router = express.Router();

// Tüm kullanıcıları listelemek: admin'e kısıtlı
router.get("/", authMiddleware, requireAdmin, listUsers);

// Tek kullanıcı: sadece kendisi veya admin
router.get("/:id", authMiddleware, validateId, requireSelfOrAdmin, getUserById);

// Kayıt: public (istersen admin'e kısıtlayabilirsin)
router.post("/", createUser);

// Güncelle/Sil: sadece kendi kaydı veya admin
router.put("/:id", authMiddleware, validateId, requireSelfOrAdmin, updateUser);
router.delete("/:id", authMiddleware, validateId, requireSelfOrAdmin, deleteUser);

module.exports = router;


//burası tamamen kullanıcı verilerini yönetme kısmı , controllerdaki fonksiyonları burda  çağırıyorum.
