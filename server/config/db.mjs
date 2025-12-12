import mongoose from "mongoose";
import "dotenv/config";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DBURL, {
      // useNewUrlParser: true, // v6.0.0 이후 기본값
      // useUnifiedTopology: true, // v6.0.0 이후 기본값
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
