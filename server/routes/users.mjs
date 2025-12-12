// server/routes/users.mjs (예시)
import express from "express";
import { protect } from "../middleware/auth.mjs"; // 인증 미들웨어 사용 예시

const router = express.Router();

// GET /api/users/profile - 사용자 프로필 조회 (로그인 사용자만 접근 가능)
router.get("/profile", protect, (req, res) => {
  // req.user는 protect 미들웨어를 통해 설정됨
  res.json(req.user);
});

export default router;
