import pandas as pd
import os
import sys
from datetime import datetime
from google import genai
from google.genai import types
from dotenv import load_dotenv
import json


# --- 1. tripdata 불러오기 ---
load_dotenv()
API_KEY = os.getenv("GOOGLE_API")
client = genai.Client(api_key=API_KEY)
MODEL_NAME = "gemini-2.5-flash"

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
excel_path = os.path.join(BASE_DIR, "data", "tripdata.xlsx")

# 엑셀 파일 읽기 시 engine 명시 및 인코딩 처리
try:
    # openpyxl 엔진 사용 (xlsx 파일용)
    tripdata = pd.read_excel(excel_path, index_col=None, engine='openpyxl')
    
    # 한글 출력이 깨지는 경우 인코딩 설정
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
except FileNotFoundError:
    print(f"파일을 찾을 수 없습니다: {excel_path}")
except Exception as e:
    print(f"파일 읽기 오류: {e}")
    # 대체 방법: xlrd 엔진 시도 (구버전 xls 파일용)
    try:
        tripdata = pd.read_excel(excel_path, index_col=None, engine='xlrd')
    except Exception as e2:
        print(f"대체 방법도 실패: {e2}")
        
print(tripdata.columns)
        

# --- 2. 사용자 입력 받기 (테마 입력 제거) ---
def get_user_inputs():
    """사용자로부터 여행 계획에 필요한 정보를 입력받습니다."""
    print("\n--- 📝 여행 계획 정보를 입력해주세요 ---")
    
    start_loc = input("출발지: ")
    # area 값은 tripdata['area'].unique()에서 확인하여 입력하는 것을 권장합니다.
    end_area = input(f"도착지 (파일의 area 값 중 하나, 예: 서울, 부산): ")
    
    # 날짜 입력 및 기간 계산
    while True:
        try:
            start_date_str = input("여행 시작 날짜 (YYYY-MM-DD): ")
            end_date_str = input("여행 마지막 날짜 (YYYY-MM-DD): ")
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
            
            if start_date > end_date:
                print("❌ 오류: 시작 날짜는 마지막 날짜보다 빠를 수 없습니다. 다시 입력해 주세요.")
                continue
            
            duration = (end_date - start_date).days + 1
            break
        except ValueError:
            print("❌ 오류: 날짜 형식이 올바르지 않습니다 (YYYY-MM-DD). 다시 입력해 주세요.")

    try:
        budget = int(input("1인 기준 총 예산 (원): "))
        people = int(input("여행 인원수: "))
    except ValueError:
        print("❌ 오류: 예산과 인원수는 숫자로 입력해야 합니다. 프로그램을 다시 시작해 주세요.")
        exit()
        
    # 🌟 테마 고정 🌟
    fixed_theme = "숙소"
    
    return {
        "start_loc": start_loc,
        "end_area": end_area,
        "start_date": start_date_str,
        "end_date": end_date_str,
        "duration": duration,
        "budget_per_person": budget,
        "total_people": people,
        "themes": [fixed_theme] # 테마는 이제 '숙소' 하나로 고정
    }

# --- 3. 데이터 필터링 및 전처리 (수정됨: area 필터링만 사용) ---
def filter_and_format_data(df, end_area, accommodation_theme):
    """사용자 입력(area)에 따라 장소 목록을 필터링하고, 별도로 숙소 목록을 필터링합니다."""
    
    # 1. 장소 목록 필터링 (area만 사용)
    # 🌟 themes를 사용하지 않고 area에 해당하는 모든 장소를 포함합니다. 🌟
    df_places = df[df['area'] == end_area].copy()
    
    if df_places.empty:
        print(f"\n❌ 오류: '{end_area}' 지역에 해당하는 장소를 찾을 수 없습니다. 조건을 다시 확인해 주세요.")
        return None

    # 2. 숙소 목록 필터링 (area와 cat='숙소' 사용)
    # 🌟 숙소로 사용할 항목은 'cat'이 '숙소'인 항목만 별도로 추출합니다. 🌟
    df_accommodations = df_places[df_places['cat'].str.contains(accommodation_theme, na=False)].copy()
    
    # 3. Gemini에게 전달할 전체 장소 정보 (장소 + 숙소 후보) 추출 및 형식화
    # 장소와 숙소를 구분하지 않고, 후보 목록 전체를 전달합니다.
    df_filtered = pd.concat([df_places, df_accommodations]).drop_duplicates().copy()

    # 필요한 열: title, y (위도), x (경도)
    places_data = df_filtered[[
        'title', 'y', 'x' 
    ]].fillna("없음").to_dict('records')
    
    formatted_places = []
    for p in places_data:
        # 좌표(위도, 경도)를 포함하여 전달
        details = (
            f"이름: {p['title']}, "
            f"좌표: {p['y']}, {p['x']}" 
        )
        formatted_places.append(details)
        
    # 숙소 후보는 별도의 목록으로 전달하여 Gemini가 숙소를 선택하기 쉽게 돕습니다.
    formatted_accommodations = []
    for p in df_accommodations[[ 'title', 'y', 'x' ]].fillna("없음").to_dict('records'):
        details = (
            f"숙소 후보 이름: {p['title']}, "
            f"좌표: {p['y']}, {p['x']}"
        )
        formatted_accommodations.append(details)


    return formatted_places, formatted_accommodations

# --- 4. Gemini API 호출 함수 (수정됨: JSON 구조를 배열 기반으로 변경) ---
def generate_travel_plan(user_info, places_data, accommodation_data):
    """Gemini API를 호출하여 여행 계획을 생성합니다."""
    
    # 전체 예산 계산
    total_budget = user_info['budget_per_person'] * user_info['total_people']
    
    # 🌟🌟🌟 프롬프트에 출력할 JSON 구조 예시를 배열 기반으로 수정하여 구조를 강제합니다. 🌟🌟🌟
    prompt = f"""
    당신은 전문 여행 플래너입니다. 아래의 정보와 장소 목록을 사용하여 {user_info['duration']}일간의 완벽한 여행 계획을 작성해 주세요.
    여행 계획은 **JSON 형식**으로만 출력해야 합니다. 오류를 피하기 위해, 최상위 키 'travel_plan'의 값은 일자별 계획을 담은 **JSON 배열(List)**이어야 합니다. JSON 형식은 STRICTLY 아래의 요구사항과 **제공된 JSON 구조 예시**를 따라야 합니다.
    
    [여행 정보]
    출발지: {user_info['start_loc']}
    도착지/여행 지역: {user_info['end_area']}
    여행 기간: {user_info['duration']}일 ({user_info['start_date']} ~ {user_info['end_date']})
    총 예산: {total_budget}원 (숙소 및 모든 활동 포함)
    여행 인원: {user_info['total_people']}명
    
    [전체 장소 후보 목록] (places에 사용)
    {places_data}
    
    [숙소 후보 목록] (accommodation에 사용)
    {accommodation_data}

    [JSON 출력 구조 예시]
    {{
      "travel_plan": [
        {{
          "day": 1, 
          "places": [
            {{
              "name": "장소 이름 (전체 후보 목록에서 선택)",
              "description": "창의적인 설명",
              "coords": "위도, 경도",
              "estimated_cost": 50000,
              "closest_subway": "가장 가까운 지하철역 이름 또는 없음"
            }},
            // ... day 1의 다른 장소 ...
          ],
          "accommodation": {{
            "name": "숙소 이름 (숙소 후보 목록에서 선택)",
            "description": "숙소 설명 (창의적으로 작성)",
            "coords": "숙소의 위도, 경도 (숙소 후보 목록에서 선택)",
            "estimated_cost": 150000,
            "closest_subway": "가장 가까운 지하철역 이름 또는 없음"
          }}
        }},
        // ... 2일차 계획은 "day": 2 객체로 추가 ...
      ]
    }}

    [JSON 출력 요구사항]
    1. **최상위 키는 'travel_plan'이며, 반드시 JSON 배열(List)로 시작**해야 합니다.
    2. 배열 내 각 객체는 **'day' (숫자), 'places' (배열), 'accommodation' (객체)** 키를 가져야 합니다.
    3. 'places'의 'name' 및 'coords' 값은 반드시 [전체 장소 후보 목록]에서 가져와야 합니다.
    4. 'accommodation'의 'name' 및 'coords' 값은 반드시 [숙소 후보 목록]에서 가져와야 합니다.
    5. **'closest_subway'** 값은 **'coords'**를 참고하여 **가장 가까운 지하철역 이름을 찾아 작성해야 합니다.** 가까운 지하철역이 없다면 **"없음"**으로 작성하세요.
    6. 'estimated_cost'는 숫자 (integer) 형식으로만 작성해야 합니다.

    **최종 출력은 오직 요구된 JSON 형식이어야 합니다. 다른 텍스트는 포함하지 마세요.**
    """

    print("\n⏳ Gemini API에 여행 계획 생성을 요청 중입니다...")
    
    # --- JSON 스키마 정의 (배열 기반으로 수정) ---

    # 1. 장소/숙소 상세 정보 스키마
    LocationDetails_schema = types.Schema(
        type=types.Type.OBJECT,
        properties={
            "name": types.Schema(type=types.Type.STRING),
            "description": types.Schema(type=types.Type.STRING),
            "coords": types.Schema(type=types.Type.STRING, description="위도, 경도 문자열 (예: 37.5665, 126.9780)"),
            "estimated_cost": types.Schema(type=types.Type.INTEGER, description="총 소비 금액 (원)"),
            "closest_subway": types.Schema(type=types.Type.STRING, description="가장 가까운 지하철역 이름 또는 '없음'")
        },
        required=["name", "description", "coords", "estimated_cost", "closest_subway"]
    )

    # 2. 하루 일정 스키마 (day, places, accommodation 포함)
    DailyPlan_schema = types.Schema(
        type=types.Type.OBJECT,
        properties={
            "day": types.Schema(type=types.Type.INTEGER, description="여행 일차 (1, 2, 3...)"),
            "places": types.Schema(
                type=types.Type.ARRAY,
                description="그날 방문할 장소 목록.",
                items=LocationDetails_schema
            ),
            "accommodation": LocationDetails_schema
        },
        required=["day", "places", "accommodation"]
    )
    
    # 3. 최상위 travel_plan 스키마 (배열)
    travel_plan_schema = types.Schema(
        type=types.Type.ARRAY,
        description="전체 여행 계획. 일자별 계획 객체의 배열입니다.",
        items=DailyPlan_schema
    )

    # 최종 GenerateContentConfig
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "travel_plan": travel_plan_schema
            },
            required=["travel_plan"]
        )
    )
    # --- JSON 스키마 정의 끝 ---

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config,
        )
        
        return json.loads(response.text)
        
    except json.JSONDecodeError:
        print("\n❌ JSON 파싱 오류: Gemini가 요청한 JSON 형식을 정확히 반환하지 못했습니다.")
        return None
    except Exception as e:
        print(f"\n❌ Gemini API 호출 중 다른 오류가 발생했습니다: {e}")
        return None

# --- 5. 메인 실행 로직 (수정됨: 필터링 결과 처리) ---
if __name__ == "__main__":
    
    # 1. 사용자 입력 받기
    user_info = get_user_inputs()
    
    # 2. 데이터 필터링 및 형식화
    filter_results = filter_and_format_data(
        tripdata, 
        user_info['end_area'], 
        user_info['themes'][0] # 고정된 '숙소' 테마를 전달
    )
    
    if filter_results:
        formatted_places, formatted_accommodations = filter_results
        
        # 숙소 후보가 없으면 오류 메시지 출력 후 종료
        if not formatted_accommodations:
             print(f"\n❌ 오류: '{user_info['end_area']}' 지역에서 '숙소' 테마를 가진 항목을 찾을 수 없습니다. 숙소 없이 여행 계획을 진행할 수 없습니다.")
        elif not formatted_places:
             print(f"\n❌ 오류: '{user_info['end_area']}' 지역에 장소 후보가 없습니다.")
        else:
            # 3. Gemini API 호출
            travel_plan_json = generate_travel_plan(
                user_info, 
                formatted_places, 
                formatted_accommodations
            )
            
            # 4. 결과 출력
            if travel_plan_json:
                print("\n=============================================")
                print("🎉 생성된 여행 계획 (JSON 형식) 🎉")
                print("=============================================")
                # 보기 좋게 JSON 출력
                print(json.dumps(travel_plan_json, indent=4, ensure_ascii=False))
                print("=============================================")
            else:
                print("\n여행 계획 생성에 실패했습니다.")