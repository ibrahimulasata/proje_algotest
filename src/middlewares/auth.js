// src/middlewares/auth.js
const jwt = require("jsonwebtoken");

// Bearer <token> zorunlu
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (!/^Bearer$/i.test(scheme) || !token) {
    return res.status(401).json({ message: "Token gerekli" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { sub, role, iat, exp }
    return next();
  } catch {
    return res.status(401).json({ message: "Token geçersiz veya süresi dolmuş" });
  }
}

// Sadece kendi kaydı ya da admin izni
function requireSelfOrAdmin(req, res, next) {
  const isSelf = String(req.user.sub) === String(req.params.id);
  const isAdmin = req.user.role === "admin";
  if (isSelf || isAdmin) return next();
  return res.status(403).json({ message: "Bu işlem için yetkin yok" });
}

// Sadece admin
function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ message: "Admin yetkisi gerekli" });
}

module.exports = { authMiddleware, requireSelfOrAdmin, requireAdmin };


//login olmuş mu, kendi kaydında mı işlem yapıyor kontrol ettim. burda kotnrol yapılıyor , geçerese next diyip devam ediliyor.
