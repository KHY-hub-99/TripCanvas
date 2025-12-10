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
 * GeoJSON 좌표를 추가하고, GeoCoding에 실패한 항목을 제거합니다.
 * @param {Object} tripData - Gemini에서 반환된 JSON 객체
 * @returns {Promise<Object>} GeoJSON 좌표가 추가되고 불필요 항목이 제거된 JSON 객체
 */
async function addGeoJSONToTripData(tripData) {
  console.log("📍 장소별 GeoJSON 좌표 변환 시작...");
  const updatedDays = []; // GeoCoding 성공한 Day만 담을 새로운 배열

  for (const day of tripData.days) {
    const updatedActivities = []; // GeoCoding 성공한 Activity만 담을 배열
    let isDayValid = true;

    // 1. 활동(Activities) GeoCoding 및 필터링
    for (const activity of day.activities) {
      const placeName = activity.placeName;
      const geoJsonLocation = await getCoordinatesFromKeyword(placeName);

      // GeoCoding에 성공한 경우에만 (coordinates가 [0, 0]이 아닌 경우) 배열에 추가
      // Kakao API의 좌표계는 일반적으로 WGS84 또는 TM 좌표계이며, [0, 0]은 실패를 의미합니다.
      if (
        geoJsonLocation.coordinates[0] !== 0 ||
        geoJsonLocation.coordinates[1] !== 0
      ) {
        activity.location = geoJsonLocation; // GeoJSON 필드 추가
        updatedActivities.push(activity);
        console.log(
          `  - ${placeName} 좌표 추가 완료: [${geoJsonLocation.coordinates}]`
        );
      } else {
        console.warn(`  - ${placeName} 좌표 획득 실패. 일정에서 제외됩니다.`);
      }
    }

    // 2. 숙소(Accommodation) GeoCoding 및 필터링
    const accommodationName = day.accommodation;
    if (accommodationName) {
      const geoJsonAccommodationLocation = await getCoordinatesFromKeyword(
        accommodationName
      );

      // 숙소 좌표 획득에 실패하면 해당 날짜(Day) 전체를 무효화 (여행에 숙소가 중요하다고 가정)
      if (
        geoJsonAccommodationLocation.coordinates[0] === 0 &&
        geoJsonAccommodationLocation.coordinates[1] === 0
      ) {
        console.error(
          `  - ${accommodationName} (숙소) 좌표 획득 실패. 해당 날짜 전체를 제외합니다.`
        );
        isDayValid = false;
      } else {
        // 숙소 정보 추가
        day.accommodationLocation = geoJsonAccommodationLocation;
        console.log(
          `  - ${accommodationName} (숙소) 좌표 추가 완료: [${geoJsonAccommodationLocation.coordinates}]`
        );
      }
    }

    // 3. 활동 개수 검사 및 Day 유효성 검사 (옵션: 요청사항 반영)
    // "있는 것들은 적어도 3개는 받을 수 있게" -> GeoCoding 성공 후 활동 개수가 3개 미만이면 Day를 제외
    if (isDayValid && updatedActivities.length >= 3) {
      day.activities = updatedActivities; // 필터링된 활동으로 업데이트
      updatedDays.push(day);
    } else if (isDayValid && updatedActivities.length < 3) {
      console.warn(
        `  - Day ${day.day}: 활동 개수가 ${updatedActivities.length}개로 3개 미만이므로 제외됩니다. (GeoCoding 성공 후 기준)`
      );
    }
  }

  // 최종적으로 업데이트된 Day 배열로 tripData 갱신
  tripData.days = updatedDays;

  console.log("✅ GeoJSON 좌표 변환 및 필터링 완료.");
  return tripData;
}

/**
 * Gemini API를 사용하여 여행 계획을 생성하는 함수 (수정됨)
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
  3. day안에 activities는 **최소 3개, 최대 4개**까지 추천해주세요. (GeoCoding 실패 대비)`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            tripTitle: {
              type: "string",
              description: "여행 전체 제목",
            },
            days: {
              type: "array",
              description: "각 날짜별 여행 일정",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  theme: { type: "string" },
                  activities: {
                    type: "array",
                    description: "해당 날짜의 구체적인 활동이나 장소 목록",
                    items: {
                      // ⭐️ 여기가 수정된 부분입니다. properties와 required가 같은 레벨에 있어야 합니다.
                      type: "object",
                      properties: {
                        placeName: {
                          type: "string",
                          description:
                            "주요 장소 이름 (카카오맵 검색 가능해야 함)",
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
                    description:
                      "해당 날짜에 추천하는 숙박 시설 이름 (카카오맵 검색 가능해야 함)",
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
    // 4. 필터링 로직 호출
    console.log("\n✅ Gemini API 응답 수신 완료.");
    const geoLocatedTripData = await addGeoJSONToTripData(tripData);
    processTripCanvas(geoLocatedTripData);
  } catch (error) {
    // 기존 오류 로깅 유지
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

generateTripCanvas("청주", "1", "150000", "조용하게 힐링할 수 있는");
