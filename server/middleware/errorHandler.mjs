// server/middleware/errorHandler.mjs
// MJS에서는 Express 미들웨어 함수를 named export로 내보냅니다.
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

// Express의 비동기 라우트 에러를 처리하기 위한 헬퍼 (express-async-handler 대체)
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
