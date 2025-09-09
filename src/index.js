// src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// --- Global middlewares ---
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*", // prod'da domain kısıtlayın
    credentials: false,
  })
);
app.use(morgan("dev"));
app.use(helmet());

// --- Root ---
app.get("/", (req, res) => {
  res.send("API çalışıyor.");
});

// --- Router'lar ---
app.use("/users", usersRouter);
app.use("/auth", authRouter);

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ message: "Kaynak bulunamadı" });
});

// --- Global error handler en sonda ---
app.use(errorHandler);

// --- Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} üzerinde çalışıyor`);
});


//projenin giriş noktası, server burada ayağa kalkıyor
