// server/config/jwt.mjs
export const jwtConfig = {
  // 실제 운영 환경에서는 환경 변수를 사용해야 합니다.
  secret: process.env.JWTKEY || "your_super_secret_key_for_jwt",
  tokenExpiresIn: "1d",
  cookieName: "token",
};
