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

  const encodedQuery = encodeURIComponent(keyword);
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodedQuery}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakao_api}` },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[Kakao API 오류] ${keyword}: HTTP 상태 ${response.status} - ${errorBody}`
      );
      return { type: "Point", coordinates: [0, 0] };
    }

    const data = await response.json();
    if (data.documents && data.documents.length > 0) {
      const doc = data.documents[0]; // 카카오는 x(경도), y(위도)를 사용
      return {
        type: "Point",
        coordinates: [parseFloat(doc.x), parseFloat(doc.y)],
      };
    } else {
      console.warn(
        `[GeoCoding 경고] 장소 "${keyword}"에 대한 검색 결과가 없습니다.`
      );
      return { type: "Point", coordinates: [0, 0] };
    }
  } catch (error) {
    console.error(
      `[네트워크 오류] 장소 ${keyword} GeoCoding 실패:`,
      error.message
    );
    return { type: "Point", coordinates: [0, 0] };
  }
}

/**
 * Gemini에서 생성한 여행 데이터에 GeoJSON 좌표를 추가합니다.
 * ❗ 이 함수는 Gemini 응답 JSON의 영문 키 ('tripSchedule', ' 'dailyPlaces', 'uniqueName', 'name')에 맞춰 수정되었습니다.
 * ❗ Gemini 스키마에 따라 좌표 배열 ([경도, 위도])만 해당 'coordinates' 객체에 저장합니다.
 * * @param {Object} tripData - Gemini에서 반환된 JSON 객체
 * @returns {Promise<Object>} GeoJSON 좌표가 추가된 JSON 객체
 */
async function addGeoJSONToTripData(tripData) {
  console.log("📍 장소별 GeoJSON 좌표 변환 시작...");

  // tripData.tripSchedule 배열을 순회합니다.
  for (const day of tripData.tripSchedule) {
    // 1. 일일 장소 (dailyPlaces) 좌표 추가
    if (day.dailyPlaces) {
      for (const place of day.dailyPlaces) {
        const placeName = place.uniqueName; // 고유 이름 사용

        // 1차 Geocoding API 호출
        // Note: 2차 검색을 시도하지 않으므로, geoJsonLocation은 const로 다시 선언 가능하지만,
        // 일관성을 위해 let을 유지하거나 const로 변경할 수 있습니다. 여기서는 const로 변경합니다.
        const geoJsonLocation = await getCoordinatesFromKeyword(placeName);

        let latitude = geoJsonLocation.coordinates[1];
        let longitude = geoJsonLocation.coordinates[0];

        // 2. 최종 좌표 확인 및 null 처리
        // Kakao API에서 검색 결과가 없을 경우 getCoordinatesFromKeyword 함수는 [0, 0]을 반환합니다.
        if (latitude === 0 && longitude === 0) {
          console.error(
            `❌ [Day ${day.day}] 장소 "${placeName}"에 대한 유효한 좌표를 찾을 수 없습니다. null 처리합니다.`
          );
          latitude = null;
          longitude = null;
        }

        // Gemini 스키마의 'coordinates' 객체에 [위도, 경도]를 저장
        place.coordinates = {
          latitude: latitude, // 위도 (y)
          longitude: longitude, // 경도 (x)
        };

        if (latitude !== null) {
          console.log(
            `  [Day ${day.day}] ${placeName} 좌표 추가 완료: [${longitude}, ${latitude}]`
          );
        }
      }
    }
  }

  console.log("✅ GeoJSON 좌표 변환 완료.");
  return tripData;
}

/**
 * Gemini API를 사용하여 여행 계획을 생성하는 함수
 * @param {string} destination - 여행 목적지
 * @param {Date} startDate - 여행 시작일
 * @param {Date} endDate - 여행 종료일
 * @param {number} budget - 예산
 * @param {string} interests - 원하는 테마 또는 흥미
 * @param {number} peoplecnt - 총 인원수
 */
async function generateTripCanvas(
  destination,
  startDate,
  endDate,
  budget,
  interests,
  peoplecnt
) {
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const oneDay = 1000 * 60 * 60 * 24;
  const daysDifference =
    Math.round((endDate.getTime() - startDate.getTime()) / oneDay) + 1;
  const totalDays = `${daysDifference}일`;

  const prompt = `**입력 정보:**

* **목적지:** ${destination}
* **여행 시작일:** ${startStr}
* **여행 종료일:** ${endStr}
* **총 여행 일수:** ${totalDays}
* **총 예산:** ${budget}원
* **관심사:** ${interests}
* **총 인원:** ${peoplecnt}명

**출력 형식 제약 조건 (필수 준수 사항):**

1.  출력은 반드시 **단일 JSON 객체** 형태여야 합니다.
2.  모든 장소는 **카카오맵**에서 정확히 일치하는 단일 검색 결과를 찾을 수 있는 실제 장소여야 합니다. 검색 시 '지역명 + 상호명'을 조합하여 고유성을 확보해야 합니다. 부가적인 설명('무한리필', '맛집', '최고의')은 절대 포함하지 않고, 고유한 상호명(Brand Name)만 사용하십시오.
3.  **장소 고유 이름** (uniqueName) 필드에는 장소 자체의 이름 (예: '익선동 한옥마을', 'N서울타워')만 포함해야 하며, '탐방', '방문', '체험', '투어' 등의 행위나 테마 관련 단어는 절대 포함하지 마십시오.
4.  모든 장소 항목에는 **고유 이름, 설명, 예상 소비 금액, 좌표 (위도/경도), 가까운 지하철역** 정보가 포함되어야 합니다. 가까운 지하철역이 없으면 '없음'으로 표기합니다.
5.  총 예상 비용은 총 예산을 초과하지 않도록 계획합니다.

당신은 한국여행 플래너입니다. 위의 입력 정보에 맞게 여행계획을 세워주세요. 제약조건도 고려하여 계획해 주시길 바랍니다.
`;

  try {
    // 2. Gemini API 호출
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json", // ❗ 영문 키가 적용된 Schema ❗
        responseSchema: {
          type: "object",
          properties: {
            tripOverview: {
              type: "object",
              properties: {
                destination: { type: "string" },
                days: { type: "string" },
                startDate: {
                  type: "string",
                  description:
                    "여행 시작 날짜를 YYYY-MM-DD 형식으로 포함합니다.",
                },
                endDate: {
                  type: "string",
                  description:
                    "여행 종료 날짜를 YYYY-MM-DD 형식으로 포함합니다.",
                },
                totalPeople: { type: "number" },
                totalEstimatedCost: { type: "number" },
              },
              required: [
                "destination",
                "days",
                "startDate",
                "endDate",
                "totalPeople",
                "totalEstimatedCost",
              ],
            },
            tripSchedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  dailyPlaces: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        uniqueName: { type: "string" },
                        description: { type: "string" },
                        estimatedCost: { type: "number" },
                        coordinates: {
                          type: "object",
                          properties: {
                            latitude: { type: "number" },
                            longitude: { type: "number" },
                          },
                          required: ["latitude", "longitude"],
                        },
                        nearbySubwayStation: { type: "string" },
                      },
                      required: [
                        "uniqueName",
                        "description",
                        "estimatedCost",
                        "coordinates",
                        "nearbySubwayStation",
                      ],
                    },
                  },
                },
                required: ["day", "dailyPlaces"],
              },
            },
          },
          required: ["tripOverview", "tripSchedule"],
        },
      },
    });

    // 3. 응답에서 JSON 문자열을 가져와 파싱
    const tripData = JSON.parse(response.text);

    // 4. TripCanvas 로직에 데이터 전달
    console.log("\n✅ Gemini API 응답 수신 완료.");
    // 응답으로 받은 장소 이름으로 좌표를 찾는 로직 (가정)
    const geoLocatedTripData = await addGeoJSONToTripData(tripData);
    processTripCanvas(geoLocatedTripData);

    return geoLocatedTripData;
  } catch (error) {
    console.error("Gemini API 호출 중 오류 발생:", error);
    throw new Error("여행 계획을 생성하는 데 실패했습니다.");
  }
}

/**
 * 최종 여행 계획 데이터를 처리하는 함수
 * (실제 환경에서는 웹 UI 렌더링 또는 데이터베이스 저장 로직이 구현됩니다.)
 * @param {object} data - Gemini API에서 반환된 여행 계획 데이터 (영문 키)
 */
function processTripCanvas(data) {
  // 1. 필요한 정보 추출 및 제목 생성
  const destination = data.tripOverview.destination;
  const totalDays = data.tripSchedule.length; // tripSchedule 배열의 길이를 사용 (실제 일정 일수)
  const tripDuration = data.tripOverview.days; // "N일" 형태의 문자열

  // 2. 제목 정의
  const generatedTitle = `${destination} ${tripDuration} 여행 계획`;

  // 3. 콘솔 출력
  console.log("-----------------------------------------");
  console.log("✨ TripCanvas에 전달된 최종 데이터 ✨");
  console.log(`**여행 제목 (동적 생성):** ${generatedTitle}`);
  console.log(`**총 여행 일수 (렌더링 준비):** ${totalDays}일`);

  // 데이터를 보기 좋게 JSON 문자열로 변환하여 출력
  console.log(JSON.stringify(data, null, 2));
  console.log("-----------------------------------------");

  // 여기에 실제 TripCanvas 라이브러리 렌더링 로직을 구현합니다.
  // 예: TripCanvas.render(data);
}

const destination = "청주";
const startDate = new Date("2025-12-13");
const endDate = new Date("2025-12-14");
const peoplecnt = 2;
const budget = 150000 * peoplecnt;
const interests = "맛집";

const oneDay = 1000 * 60 * 60 * 24;
const daysDifference =
  Math.round((endDate.getTime() - startDate.getTime()) / oneDay) + 1;
const totalDays = `${daysDifference}일`;

console.log(`${destination} ${totalDays} 일정 생성 중...`);
generateTripCanvas(
  destination,
  startDate,
  endDate,
  budget,
  interests,
  peoplecnt
);
