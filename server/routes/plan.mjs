import express from "express";
import { spawn } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";
import { protect } from "../middleware/auth.mjs";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 프로젝트 루트
const PROJECT_ROOT = path.resolve(__dirname, "../../");

router.post("/generate", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const userInput = { ...req.body, userId };

    const requestId = Date.now();

    const pythonScriptPath = path.join(
      PROJECT_ROOT,
      "server/services/TripPlan_base_api.py"
    );

    console.log("▶ Python Script:", pythonScriptPath);
    console.log("▶ User Input:", userInput);

    // ✅ Python 실행 (인자 ❌)
    const py = spawn("python", [pythonScriptPath], {
      env: { PYTHONIOENCODING: "utf-8" },
    });

    // ✅ JSON을 STDIN으로 전달
    py.stdin.write(JSON.stringify(userInput));
    py.stdin.end();

    // (선택) Python 출력 받기
    py.stdout.on("data", (data) => {
      console.log("🐍 Python:", data.toString());
    });

    py.stderr.on("data", (data) => {
      console.error("🐍 Python Error:", data.toString());
    });

    res.status(202).json({
      message: "여행 계획 생성 시작",
      requestId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "실행 실패" });
  }
});

export default router;
