// /middleware/authMiddleware.mjs
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWTKEY; // 실제 프로젝트에서는 환경 변수로 관리하세요

// 사용자 인증 상태를 확인하고 요청에 user 정보를 추가하는 미들웨어
export const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  // 토큰이 존재하는지 확인
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.error("JWT 검증 실패:", err);
        // 토큰이 유효하지 않으면 로그인 페이지로 리디렉션
        return res.redirect("/login.html");
      }
      // 토큰이 유효하면 사용자 ID를 요청 객체에 추가 (필요한 경우)
      req.user = decodedToken;
      next();
    });
  } else {
    // 토큰이 없으면 로그인 페이지로 리디렉션
    res.redirect("/login.html");
  }
};
