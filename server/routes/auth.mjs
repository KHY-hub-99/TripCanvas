// server/routes/auth.mjs
import express from "express";
import User from "../models/User.mjs";
import { generateTokenAndSetCookie } from "../utils/helpers.mjs";
import { jwtConfig } from "../config/jwt.mjs";
import { asyncHandler } from "../middleware/errorHandler.mjs"; // MJS 헬퍼 사용
import { protect } from "../middleware/auth.mjs";

const router = express.Router();

/**
 * @desc    새로운 사용자 등록 (회원가입)
 * @route   POST /api/auth/signup
 */
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { username, nickname, userId, password, email, profileImage } =
      req.body;

    if (!username || !nickname || !userId || !password || !email) {
      res.status(400);
      throw new Error("모든 필수 필드를 입력해주세요.");
    }

    const userExists = await User.findOne({
      $or: [{ userId }, { email }, { nickname }],
    });
    if (userExists) {
      if (userExists.userId === userId) {
        res.status(400);
        throw new Error("이미 사용 중인 아이디입니다.");
      } else if (userExists.email === email) {
        res.status(400);
        throw new Error("이미 등록된 이메일입니다.");
      } else if (userExists.nickname === nickname) {
        res.status(400);
        throw new Error("이미 사용 중인 닉네임입니다.");
      }
    }

    const user = await User.create({
      username,
      nickname,
      userId,
      password,
      email,
      profileImage: profileImage || undefined,
    });

    if (user) {
      generateTokenAndSetCookie(res, user._id);

      res.status(201).json({
        _id: user._id,
        userId: user.userId,
        email: user.email,
        message: "회원가입에 성공했습니다.",
      });
    } else {
      res.status(400);
      throw new Error("유효하지 않은 사용자 데이터입니다.");
    }
  })
);

/**
 * @desc    사용자 인증 (로그인)
 * @route   POST /api/auth/login
 */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { userId, password } = req.body;

    const user = await User.findOne({ userId });

    if (user && (await user.matchPassword(password))) {
      generateTokenAndSetCookie(res, user._id);

      res.json({
        _id: user._id,
        userId: user.userId,
        email: user.email,
        nickname: user.nickname,
        username: user.username,
        message: "로그인에 성공했습니다.",
      });
    } else {
      res.status(401);
      throw new Error("유효하지 않은 아이디 또는 비밀번호입니다.");
    }
  })
);

/**
 * @desc    사용자 로그아웃
 * @route   POST /api/auth/logout
 * @access  Private (유효한 토큰이 있을 때만 처리)
 */
router.post("/logout", protect, (req, res) => {
  // 🚨 protect 미들웨어 적용
  // 이 블록은 유효한 토큰을 가진 사용자만 도달할 수 있습니다.

  // 1. 쿠키에서 토큰 삭제 (만료)
  res.cookie(jwtConfig.cookieName, "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res
    .status(200)
    .json({ message: `${req.user.nickname}님, 로그아웃에 성공했습니다.` });
});

export default router;
