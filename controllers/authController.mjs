// /controllers/authController.mjs
import User from "../data/userData.mjs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWTKEY; // authMiddleware와 동일하게 설정
const MAX_AGE = 1 * 24 * 60 * 60; // 1일 (초 단위)

// JWT 생성 함수
const createToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: MAX_AGE,
  });
};

// 1. 회원가입 로직
export const signup = async (req, res) => {
  const { username, userid, password } = req.body;

  try {
    // 비밀번호 암호화
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // 새로운 사용자 생성 및 저장
    const user = await User.create({
      username,
      userid,
      password: hashedPassword,
    });

    // 회원가입 성공 시 바로 로그인 처리
    const token = createToken(user._id);
    res.cookie("jwt", token, { httpOnly: true, maxAge: MAX_AGE * 1000 });

    res.status(201).json({
      success: true,
      message: "회원가입 및 로그인 성공",
      userId: user.userid,
    });
  } catch (err) {
    let message = "회원가입에 실패했습니다.";
    if (err.code === 11000) {
      message = "이미 존재하는 아이디입니다.";
    }
    console.error("회원가입 오류:", err);
    res.status(400).json({ success: false, message });
  }
};

// 2. 로그인 로직
export const login = async (req, res) => {
  const { userid, password } = req.body;

  try {
    // User ID로 사용자 찾기
    const user = await User.findOne({ userid });

    if (user) {
      // 비밀번호 비교
      const auth = await bcrypt.compare(password, user.password);
      if (auth) {
        // 인증 성공 시 토큰 발급
        const token = createToken(user._id);
        res.cookie("jwt", token, { httpOnly: true, maxAge: MAX_AGE * 1000 });
        return res.status(200).json({ success: true, message: "로그인 성공" });
      }
      // 비밀번호 불일치
      return res
        .status(400)
        .json({ success: false, message: "비밀번호가 일치하지 않습니다." });
    }
    // 사용자 ID를 찾을 수 없음
    res
      .status(404)
      .json({ success: false, message: "사용자를 찾을 수 없습니다." });
  } catch (err) {
    console.error("로그인 오류:", err);
    res
      .status(500)
      .json({ success: false, message: "서버 오류로 로그인에 실패했습니다." });
  }
};

// 3. 로그아웃 로직
export const logout = (req, res) => {
  // 쿠키의 'jwt' 값을 빈 문자열로, 만료 시간을 과거로 설정하여 쿠키를 삭제합니다.
  res.cookie("jwt", "", { maxAge: 1 });
  // 로그아웃 후 로그인 페이지로 리디렉션
  res
    .status(200)
    .json({ success: true, message: "로그아웃 성공", redirect: "/login.html" });
};
