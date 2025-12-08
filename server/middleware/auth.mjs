// server/middleware/auth.mjs
import jwt from "jsonwebtoken";
import User from "../models/User.mjs";
import { jwtConfig } from "../config/jwt.mjs";
import { asyncHandler } from "./errorHandler.mjs"; // errorHandler.mjs에서 import

// JWT 토큰을 검증하고 사용자 정보를 req.user에 저장하는 미들웨어
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. 쿠키에서 토큰 이름(token)을 찾습니다.
  if (req.cookies && req.cookies[jwtConfig.cookieName]) {
    token = req.cookies[jwtConfig.cookieName];
  }

  if (!token) {
    res.status(401); // Unauthorized
    throw new Error("로그인이 필요합니다.");
  }

  try {
    // 2. 토큰 검증
    const decoded = jwt.verify(token, jwtConfig.secret);

    // 3. 사용자 정보 조회 (보안을 위해 비밀번호 제외)
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      res.status(401);
      throw new Error(
        "유효하지 않은 토큰입니다. 사용자 정보를 찾을 수 없습니다."
      );
    }

    next();
  } catch (error) {
    console.error("인증 실패:", error);
    res.status(401);
    throw new Error("유효하지 않은 토큰입니다. 다시 로그인 해주세요.");
  }
});
