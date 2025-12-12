// server/config/jwt.mjs
import jwt from "jsonwebtoken";
import "dotenv/config";

const generateToken = (id) => {
  // payload: 사용자 ID, SECRET: 환경 변수에서 가져옴, expiresIn: 토큰 만료 시간
  return jwt.sign({ id }, process.env.JWTKEY, {
    expiresIn: "1d", // 1일
  });
};

export default generateToken;
