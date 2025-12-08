import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const kakao_api = process.env.KAKAO_API;
const google_api = process.env.GOOGLE_API;
if (!google_api) {
  throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
}
const ai = new GoogleGenAI({ apiKey: google_api });

/**
 * 장소 이름을 기반으로 경도와 위도를 얻어 GeoJSON Point 객체를 반환합니다.
 * 실제 구현 시, 카카오/네이버/구글 등의 Geocoding API를 호출해야 합니다.
 * @param {string} keyword - 검색할 장소 이름
 * @returns {Promise<Object>} GeoJSON Point 객체 { type: "Point", coordinates: [경도, 위도] }
 */
async function getCoordinatesFromKeyword(keyword) {
  // KAKAO_API 환경 변수 확인 로직 (유지)
  if (!kakao_api) {
    console.error(
      "환경 변수 KAKAO_API가 설정되지 않았습니다. GeoCoding을 실행할 수 없습니다."
    );
    return { type: "Point", coordinates: [0, 0] };
  }

  const encodedQuery = encodeURIComponent(keyword); // 키워드 검색 엔드포인트 사용
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodedQuery}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakao_api}` },
    }); // 1. HTTP 상태 코드 확인 (응답이 성공적이었는지 확인)

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[Kakao API 오류] ${keyword}: HTTP 상태 ${response.status} - ${errorBody}`
      );
      return { type: "Point", coordinates: [0, 0] };
    }

    const data = await response.json();
    if (data.documents && data.documents.length > 0) {
      const doc = data.documents[0]; // 카카오는 x(경도), y(위도)를 사용 -> GeoJSON [경도, 위도]
      return {
        type: "Point",
        coordinates: [parseFloat(doc.x), parseFloat(doc.y)],
      };
    } else {
      console.warn(
        `[GeoCoding 경고] 장소/숙소 "${keyword}"에 대한 검색 결과가 없습니다.`
      );
      return { type: "Point", coordinates: [0, 0] };
    }
  } catch (error) {
    // catch 블록에서 error 객체를 받도록 수정
    console.error(
      `[네트워크 오류] 장소/숙소 ${keyword} GeoCoding 실패:`,
      error.message // error.message를 출력하도록 수정
    );
    return { type: "Point", coordinates: [0, 0] };
  }
}

/**
 * Gemini에서 생성한 여행 데이터에 GeoJSON 좌표를 추가합니다.
 * @param {Object} tripData - Gemini에서 반환된 JSON 객체
 * @returns {Promise<Object>} GeoJSON 좌표가 추가된 JSON 객체
 */
async function addGeoJSONToTripData(tripData) {
  console.log("📍 장소별 GeoJSON 좌표 변환 시작...");
  for (const day of tripData.days) {
    // 병렬로 API를 호출하여 속도를 높일 수 있지만, 여기서는 간단하게 순차 처리합니다.
    for (const activity of day.activities) {
      const placeName = activity.placeName;

      // Geocoding API 호출
      const geoJsonLocation = await getCoordinatesFromKeyword(placeName);

      // GeoJSON 필드 추가
      activity.location = geoJsonLocation;
      console.log(
        `  - ${placeName} 좌표 추가 완료: [${geoJsonLocation.coordinates}]`
      );
    }

    // 숙소 지오 정보 가져오기
    const accommodationName = day.accommodation;
    if (accommodationName) {
      const geoJsonAccommodationLocation = await getCoordinatesFromKeyword(
        accommodationName
      );

      // 새로운 필드 'accommodationLocation'에 GeoJSON 객체 저장
      day.accommodationLocation = geoJsonAccommodationLocation;
      console.log(
        `  - ${accommodationName} (숙소) 좌표 추가 완료: [${geoJsonAccommodationLocation.coordinates}]`
      );
    }
  }
  console.log("✅ GeoJSON 좌표 변환 완료.");
  return tripData;
}

/**
 * Gemini API를 사용하여 여행 계획을 생성하는 함수
 * @param {string} destination - 여행 목적지
 * @param {string} budget - 예산
 * @param {string} during - 여행 기한
 * @param {string} interests - 원하는 테마 또는 흥미
 */
async function generateTripCanvas(destination, during, budget, interests) {
  console.log(`✨ ${destination} 여행 계획 생성 중...`);
  const prompt = `당신은 한국 여행 플래너입니다. 목적지는 ${destination}인 ${during}일 여행 일정을 ${budget}원의 예산으로 생성해 주세요. 여행자는 "${interests}"에 관심이 많습니다.
  각 날짜별로 주요 장소와 간단한 설명, 주요 장소 근처의 지하철역, 주요장소 근처의 숙박시설을 추천하고 'tripcanvas'에서 활용할 수 있는 JSON 형식의 데이터만 출력하세요.
  **제약조건**
  1. activities안의 주요장소는 1곳만 추천 / 예) 가능 : 여수낭만포차거리, 불가능 : 종포해양공원 & 여수 낭만포차거리
  1-1. 장소이름 옆에 "(포차존)"과 같은 부가적인 설명 빼기 -> 카카오맵에서 검색 가능하게 하기 위해
  2. 숙박시설은 카카오맵에서 검색가능한 숙박시설을 추천
  3. day안에 activities는 최대 3개까지만 추천 -> 판단하에 1개, 2개, 3개 가능`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            tripTitle: { type: "string" },
            days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  theme: { type: "string" },
                  activities: {
                    type: "array",
                    // ⭐⭐ 이 부분이 추가/수정되었습니다!
                    items: {
                      type: "object", // activities 배열의 각 항목은 문자열입니다.
                      description: "해당 날짜의 구체적인 활동이나 장소 정보",
                      properties: {
                        placeName: {
                          type: "string",
                          description: "주요 장소 이름",
                        },
                        description: {
                          type: "string",
                          description: "장소에 대한 간단한 설명",
                        },
                        subwayStation: {
                          type: "string",
                          description: "장소 근처의 지하철역 이름",
                        },
                      },
                      required: ["placeName", "description", "subwayStation"],
                    },
                  },
                  accommodation: {
                    type: "string",
                    description: "해당 날짜에 추천하는 숙박 시설 이름",
                  },
                },
                required: ["day", "theme", "activities", "accommodation"],
              },
            },
          },
          required: ["tripTitle", "days"],
        },
      },
    });
    // 3. 응답에서 JSON 문자열을 가져와 파싱
    const tripData = JSON.parse(response.text);
    // 4. TripCanvas 로직에 데이터 전달 (가상의 tripcanvas 함수)
    console.log("\n✅ Gemini API 응답 수신 완료.");
    const geoLocatedTripData = await addGeoJSONToTripData(tripData);
    processTripCanvas(geoLocatedTripData);
  } catch (error) {
    console.error("Gemini API 호출 중 오류 발생:", error);
  }
}
function processTripCanvas(data) {
  // 여기에 실제 tripcanvas 라이브러리를 import하여 데이터를 활용하는 로직을 구현합니다.
  // 예: TripCanvas.render(data);
  console.log("-----------------------------------------");
  console.log("TripCanvas에 전달된 데이터의 제목:", data.tripTitle);
  console.log(`TripCanvas에서 ${data.days.length}일 일정을 렌더링 준비.`);
  console.log(JSON.stringify(data, null, 2));
  console.log("-----------------------------------------");
}

generateTripCanvas("수원", "1", "150000", "조용하게 힐링할 수 있는");
