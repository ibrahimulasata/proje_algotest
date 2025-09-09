const rateLimit = require("express-rate-limit");

// Login'a basit brute-force koruması
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,   // 5 dakika
  max: 10,                   // 5 dk'da 10 deneme
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Çok fazla deneme. Lütfen sonra tekrar deneyin." }
});

module.exports = { loginLimiter };
