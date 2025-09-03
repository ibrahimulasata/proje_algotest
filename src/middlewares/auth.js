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

// Sadece kendi kaydında işlem
function canActOnSelf(req, res, next) {
  if (String(req.user.sub) !== String(req.params.id)) {
    return res.status(403).json({ message: "Bu işlem için yetkin yok" });
  }
  next();
}

module.exports = { authMiddleware, canActOnSelf };
