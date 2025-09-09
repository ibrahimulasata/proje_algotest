// path param :id pozitif integer mı?
module.exports = function validateId(req, res, next) {
  const n = Number(req.params.id);
  if (!Number.isInteger(n) || n <= 0) {
    return res.status(400).json({ message: "Geçersiz id" });
  }
  next();
};
