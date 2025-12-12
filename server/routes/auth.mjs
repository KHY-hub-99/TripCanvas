// server/routes/auth.mjs
import express from "express";
import User from "../models/User.mjs";
import generateToken from "../config/jwt.mjs";

const router = express.Router();

// POST /api/auth/signup - 회원가입
router.post("/signup", async (req, res) => {
  const { userid, email, nickname, password } = req.body;

  // 1. 이미 존재하는 유저인지 확인 (userid 또는 email)
  const useridfind = await User.findOne({ userid });
  const usernickfind = await User.findOne({ nickname });

  const userExists = await User.findOne({
    $or: [{ userid }, { nickname }, { email }],
  });

  if (userExists) {
    if (userExists.userid === userid) {
      return res.status(400).json({ message: "이미 존재하는 아이디입니다." });
    }
    if (userExists.nickname === nickname) {
      return res.status(400).json({ message: "이미 존재하는 닉네임입니다." });
    }
    if (userExists.email === email) {
      return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    }
  }

  // 2. 새로운 유저 생성 및 저장 (pre-save 훅에서 비밀번호 암호화됨)
  const user = await User.create({
    userid,
    email,
    nickname,
    password,
  });

  if (user) {
    // 회원가입 성공 후 바로 로그인 처리 또는 성공 응답
    res.status(201).json({
      _id: user._id,
      userid: user.userid,
      email: user.email,
      nickname: user.nickname,
      // token: generateToken(user._id), // 필요하다면 토큰도 함께 전송
      message: "회원가입되었습니다.",
    });
  } else {
    res.status(400).json({ message: "Invalid user data" });
  }
});

// POST /api/auth/login - 로그인
router.post("/login", async (req, res) => {
  const { userid, password } = req.body;

  // 1. 유저 ID로 유저 찾기
  const user = await User.findOne({ userid });

  // 2. 유저가 존재하고 비밀번호가 일치하는지 확인
  if (user && (await user.matchPassword(password))) {
    // 3. 인증 성공: JWT 토큰 생성 및 전송
    res.json({
      _id: user._id,
      userid: user.userid,
      email: user.email,
      nickname: user.nickname,
      token: generateToken(user._id), // 클라이언트가 이후 API 요청에 사용할 토큰
    });
  } else {
    // 유저가 없거나(user === null) 비밀번호가 일치하지 않는 경우
    res
      .status(401)
      .json({ message: "아이디 또는 비밀번호가 일치하지 않습니다." });
  }
});

export default router;
