import Place from "../models/Place.js"; // 모델 경로 확인
import * as XLSX from "xlsx";
import fs from "fs";
import connectDB from "../config/db.mjs";
import dotenv from "dotenv";

dotenv.config(); // .env 파일 로드
// 🚨 중요: MongoDB 연결 설정이 선행되어야 합니다.
connectDB();

// 사용자가 제공한 파일명을 기반으로 경로 설정
// 만약 파일명이 "tripdata.xlsx"라면 이 경로를 사용하세요.
const EXCEL_FILE_PATH = "C:/KHY/TripCanvas/server/services/data/tripdata.xlsx";

async function importData() {
  console.log(`🚀 ${EXCEL_FILE_PATH} 파일 읽기 시작...`);

  let workbook;
  try {
    // 1. 파일 읽기 (Buffer 타입으로 읽기)
    const fileBuffer = fs.readFileSync(EXCEL_FILE_PATH);

    // 파일 확장자에 따라 csv 또는 xlsx로 처리 방식 분기 가능
    const fileType = EXCEL_FILE_PATH.endsWith(".csv")
      ? { type: "buffer", cellDelimiter: "," }
      : { type: "buffer" };

    // 2. 워크북(Workbook) 로드
    workbook = XLSX.read(fileBuffer, fileType);
  } catch (error) {
    console.error(`❌ 파일 읽기 실패: ${error.message}`);
    return;
  }

  // 3. 첫 번째 시트의 데이터 추출
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 데이터를 JSON 배열로 변환. 첫 행을 키로 사용 (title, area, x, y 등)
  const rawPlaces = XLSX.utils.sheet_to_json(worksheet);

  const placesToInsert = [];

  // 4. 데이터 매핑 및 유효성 검사
  rawPlaces.forEach((row) => {
    // 데이터 유효성 검사 (필수 필드 체크)
    if (
      !row.contentid ||
      !row.title ||
      !row.cat ||
      !row.addr ||
      !row.area ||
      !row.detail_addr ||
      !row.x ||
      !row.y
    ) {
      console.warn(
        `⚠️ 경고: 필수 데이터 누락 (title: ${row.title || "N/A"}) - 건너뜀`
      );
      return;
    }

    const placeData = {
      // ===== 고유 식별자 =====
      contentId: String(row.contentid), // 스키마가 String이므로 String으로 변환

      // ===== 기본 정보 =====
      title: row.title,
      category: row.cat,

      // ===== 주소 정보 =====
      address: {
        full: row.addr,
        city: row.area, // 시/도
        district: row.detail_addr, // 시군구
      },

      // ===== 좌표 (GeoJSON 형식) [lng, lat] =====
      coordinates: {
        type: "Point",
        coordinates: [
          parseFloat(row.x), // 경도 (lng)
          parseFloat(row.y), // 위도 (lat)
        ],
      },

      // dataSource는 pre('save') 훅에 의해 자동 처리됩니다.
    };

    placesToInsert.push(placeData);
  });

  console.log(
    `총 ${placesToInsert.length}개의 데이터 처리 완료. DB 저장 시작...`
  );

  // 5. MongoDB에 데이터 일괄 삽입
  try {
    // 'ordered: false'를 사용하면 일부 중복 오류가 발생해도 다른 데이터 삽입을 계속 시도합니다.
    const result = await Place.insertMany(placesToInsert, { ordered: false });
    console.log(`✅ ${EXCEL_FILE_PATH}: 총 ${result.length}개 임포트 완료`);
  } catch (error) {
    // E11000 에러(contentId 중복)가 흔히 발생할 수 있습니다.
    console.error(`❌ 데이터 삽입 중 에러 발생: ${error.message}`);
    if (error.writeErrors) {
      console.error(
        `중복 데이터 등 삽입 실패 건수: ${error.writeErrors.length}건`
      );
    }
  }
}

// 스크립트 실행 함수 호출
importData();
