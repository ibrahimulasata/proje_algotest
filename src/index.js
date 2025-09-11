// src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const errorHandler = require("./middlewares/errorHandler");

const app = express();

// --- Global middlewares ---
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: false,
  })
);
app.use(morgan("dev"));
app.use(helmet());

// --- Root ---
app.get("/", (req, res) => {
  res.send("API çalışıyor.");
});

// --- Router'lar (SADE) ---
app.use("/auth", require("./routes/AuthRoutes"));
app.use("/users", require("./routes/UserRoutes"));
app.use("/questions", require("./routes/QuestionRoutes"));
app.use("/questions", require("./routes/AnswerRoutes")); // /questions/:id/answers

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ message: "Kaynak bulunamadı" });
});

// --- Global error handler ---
app.use(errorHandler);

// --- Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} üzerinde çalışıyor`);
});
