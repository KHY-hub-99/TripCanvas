// server/middleware/auth.mjs
import jwt from "jsonwebtoken";
import User from "../models/User.mjs";
import "dotenv/config";

const protect = async (req, res, next) => {
  let token;

  // 헤더에서 'Authorization: Bearer <token>' 형태의 토큰 확인
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 'Bearer ' 부분을 제거하고 토큰 값만 가져옴
      token = req.headers.authorization.split(" ")[1];

      // 토큰 디코딩 (payload: { id: ... })
      const decoded = jwt.verify(token, process.env.JWTKEY);

      // 디코딩된 ID로 사용자 정보 조회 (비밀번호 제외)
      req.user = await User.findById(decoded.id).select("-password");

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "유효하지 않은 토큰입니다." });
    }
  }

  if (!token) {
    res.status(401).json({ message: "인증되지 않은 회원입니다." });
  }
};

export { protect };
