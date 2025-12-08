// server/utils/helpers.mjs
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.mjs";

const { secret, tokenExpiresIn } = jwtConfig;

/**
 * JWT 토큰을 생성하고 HTTP Only 쿠키에 설정하는 함수
 */
export const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, secret, {
    expiresIn: tokenExpiresIn,
  });

  res.cookie(jwtConfig.cookieName, token, {
    httpOnly: true, // XSS 공격 방지
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 1일 (밀리초)
  });
};
