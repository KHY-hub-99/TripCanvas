// app.mjs
import express from "express";
// 🚨 경로 수정: data/database.mjs -> config/db.mjs
import connectDB from "./config/db.mjs";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.mjs";
import { requireAuth } from "./middleware/authMiddleware.mjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 데이터베이스 연결
connectDB(); // config/db.mjs 호출

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, "public")));

// 인증 라우트 설정
app.use("/auth", authRoutes);

// 루트 ('/') 접근 시 로그인 페이지로 리디렉션
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// 메인 페이지 (인증 필요)
app.get("/main.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "main.html"));
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
