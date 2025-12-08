import cookieParser from "cookie-parser";
import connectDB from "./config/db.mjs";
import authRoutes from "./routes/auth.mjs";
import { errorHandler } from "./middleware/errorHandler.mjs";
import express from "express";

// process.env 사용을 위해 .env 파일을 사용한다면 dotenv 패키지를 import 해야 합니다.
// import dotenv from 'dotenv';
// dotenv.config();

// DB 연결
connectDB();

const app = express();

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 라우트 등록
app.use("/api/auth", authRoutes);

// 🚨 [새로 추가된 부분] 루트 경로 ('/') 라우트 설정
app.get("/", (req, res) => {
  // 302 Found 또는 301 Moved Permanently 상태 코드를 사용하여
  // 브라우저에게 login.html 경로로 이동하라고 지시합니다.
  return res.redirect("/login.html");
});

// 프론트엔드 정적 파일 서빙 (client/public 폴더를 정적 폴더로 지정)
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_PATH = path.join(__dirname, "..", "client", "public");

// 정적 파일 미들웨어는 라우트 핸들러 뒤에 위치해야 루트 라우트가 우선적으로 처리됩니다.
app.use(express.static(CLIENT_PATH));

// 에러 핸들링 미들웨어
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`🚀 MJS 서버가 http://localhost:${PORT} 에서 실행 중입니다.`)
);
