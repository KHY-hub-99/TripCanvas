// server/index.js (서버 진입점 예시)
import express from "express";
import dotenv from "dotenv";
import connectDB from "./server/config/db.mjs";
import authRoutes from "./server/routes/auth.mjs";
import userRoutes from "./server/routes/users.mjs"; // 다른 라우트도 연결

dotenv.config(); // .env 파일 로드
connectDB(); // MongoDB 연결

const app = express();
app.use(express.json()); // JSON 요청 본문 파싱

// API 라우트 연결
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// 정적 파일 제공 (클라이언트 HTML 파일 제공)
app.use(express.static("client/public"));
app.use("/pages", express.static("client/pages"));

// 에러 핸들러 (옵션)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something broke!" });
});

const PORT = 8080;
app.listen(PORT, console.log(`Server running on port ${PORT}`));
console.log("http://localhost:8080");
