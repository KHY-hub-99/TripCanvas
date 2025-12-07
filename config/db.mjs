import mongoose from "mongoose";
import "dotenv/config";

const connectDB = async () => {
  try {
    const mongoURI = process.env.DBURL; // **<-- 여기에 MongoDB 연결 문자열을 넣으세요**
    await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB 연결 성공!`);
  } catch (error) {
    console.error("❌ MongoDB 연결 실패:", error.message);
    // 서버 종료
    process.exit(1);
  }
};

export default connectDB;
