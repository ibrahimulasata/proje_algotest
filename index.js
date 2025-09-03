// src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

// Router'lar
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");

// Hata yakalayıcı (en sonda use edilecek)
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// --- Global middlewares ---
app.use(express.json());     // JSON body
app.use(cors());             // CORS (gerekirse: cors({ origin: "http://localhost:5173" }))
app.use(morgan("dev"));      // İstek logları
app.use(helmet());           // Güvenlik header'ları

// --- Root ---
app.get("/", (req, res) => {
  res.send("API çalışıyor.");
});

// --- Router'lar ---
app.use("/users", usersRouter);
app.use("/auth", authRouter);

// --- Global error handler en sonda ---
app.use(errorHandler);

// --- Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} üzerinde çalışıyor`);
});
