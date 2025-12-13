// server/middleware/auth.mjs
import jwt from "jsonwebtoken";
import User from "../models/User.mjs";
import "dotenv/config";

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "인증 토큰이 없습니다." });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWTKEY);

    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (error) {
    console.error("JWT ERROR:", error.message);
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
};

export { protect };
