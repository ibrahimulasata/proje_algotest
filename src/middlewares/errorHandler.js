// src/middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  // İsteğe göre burada err.stack'i loglayabilirsin
  console.error("Hata:", err);

  // Özel status atanmışsa onu kullan, yoksa 500
  const status = err.status || 500;
  const payload = {
    message: err.message || "Server hatası",
  };

  // Geliştirme ortamında daha detay ver (opsiyonel)
  if (process.env.NODE_ENV !== "production") {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
