// server/models/User.mjs
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema(
  {
    userid: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    nickname: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImg: {
      type: String,
      default: null,
    },
    // 자기소개
    bio: {
      type: String,
      maxlength: [200, "자기소개는 200자 이하여야 합니다"],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// 비밀번호 비교 메서드 (로그인 시 사용)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 비밀번호 저장 전에 암호화 (Pre-save Hook)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.virtual("trips", {
  ref: "Trip", // 연결할 모델
  localField: "_id", // User의 어떤 필드를
  foreignField: "owner", // Trip의 어떤 필드와 매칭할지(Trip 모델에서 사용자를 가리키는 필드명이 owner임)
});

userSchema.virtual("bucketlists", {
  ref: "Bucketlist",
  localField: "_id",
  foreignField: "userId",
});

const User = mongoose.model("User", userSchema, "user");
export default User;
