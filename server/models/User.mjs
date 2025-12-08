// server/models/User.mjs
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    nickname: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    username: { type: String, required: true, trim: true },
    profileImage: { type: String, default: "/uploads/default-profile.png" },
  },
  { timestamps: true }
);

// 비밀번호 해싱 미들웨어 (저장 전)
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 비밀번호 비교 메서드
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", UserSchema, "user");
export default User;
