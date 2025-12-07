// /routes/authRoutes.mjs
import { Router } from "express";
import { signup, login, logout } from "../controllers/authController.mjs";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/logout", logout); // 로그아웃은 단순 GET 요청으로 처리

export default router;
