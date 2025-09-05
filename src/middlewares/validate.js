// src/middlewares/validate.js
const Joi = require("joi");

/**
 * Joi şemasını alır, req.body'yi doğrular.
 * Hataları tek bir 400 cevabında döner.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // tüm hataları topla
      stripUnknown: true // şemada olmayan alanları at
    });
    if (error) {
      return res.status(400).json({
        message: "Doğrulama hatası",
        errors: error.details.map(d => d.message),
      });
    }
    req.body = value; // temizlenmiş değerler
    next();
  };
}

module.exports = validate;
//gelen verilerin formatı doğru mu ? örneğin şifre en az 6 kareketer mi 