import requests
from urllib.parse import urlencode, unquote
import xml.etree.ElementTree as ET
import pandas as pd
import time
import math
import sys


sys.stdout.reconfigure(encoding='utf-8')

page_no = 1
key = "d76ac5e297694f1394b83e27c3db86757fa9841547096b05c70788028361e5a1"
base_url = f"http://apis.data.go.kr/B551011/KorService2/areaBasedList2"    

def fetch_page_data(page_num, num_of_rows, contentTypeId):
    """
    ID  콘텐츠              설명
    12	관광지	            가장 일반적인 관광 명소 (궁궐, 사찰, 공원, 박물관, 자연 명소 등)
    14	문화시설	        박물관, 미술관, 공연장, 기념관 등 문화 활동 관련 시설
    15	행사/공연/축제	     기간이 한정된 이벤트 정보 (지역 축제, 콘서트, 정기 공연 등)
    25	여행 코스	        여러 장소를 묶어 제공하는 추천 여행 경로 (도보, 자전거 코스 등)
    28	레포츠	            등산, 스키, 골프, 수상 레포츠 등 스포츠 및 여가 활동 시설
    32	숙박	            호텔, 콘도, 펜션, 게스트하우스, 한옥 등 숙박 시설
    38	쇼핑	            시장, 백화점, 면세점, 전문 쇼핑몰 등 구매 관련 시설
    39	음식점              맛집, 전문 식당 등 식도락 관련 시설
    
    
    1	서울특별시
    2	인천광역시
    3	대전광역시
    4	대구광역시
    5	광주광역시
    6	부산광역시
    7	울산광역시
    8	세종특별자치시
    31	경기도
    32	강원특별자치도
    33	충청북도
    34	충청남도
    35	경상북도
    36	경상남도
    37	전북특별자치도
    38	전라남도
    39	제주특별자치도
    """
    try:
        params = {
            'numOfRows': num_of_rows,
            'pageNo': page_num,
            'MobileOS': 'ETC',
            'MobileApp': 'AppTest',
            'ServiceKey': unquote(key), # Use unquote if the key might contain URL-encoded chars
            'arrange': 'A',
            'contentTypeId': contentTypeId, # 12 usually means 'Attractions' or 'Tour Sites'
            'areaCode': '',
            'sigunguCode': '',
            'cat1': '',
            'cat2': '',
            'cat3': ''
        }

        # Encode parameters for the final URL
        query_string = urlencode(params)
        request_url = f"{base_url}?{query_string}"


        response = requests.get(request_url, timeout=300) # Added a timeout
        time.sleep(5)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        root = ET.fromstring(response.content)
        items = root.findall('./body/items/item')
        
        if not items:
                print(f"⚠️ 페이지 {page_no}에서 데이터를 찾을 수 없습니다. (데이터 소진 또는 오류)")

        # Simple parsing logic (you may need to extend this)
        page_data = []
        for item in items:
            data = {}
            # Example fields - retrieve fields relevant to your need
            data['title'] = item.find('title').text if item.find('title') is not None else 'N/A'
            data['area'] = item.find('areacode').text if item.find('areacode') is not None else 'N/A'
            data['contentid'] = item.find('contentid').text if item.find('contentid') is not None else 'N/A'
            addr1 = item.find('addr1').text if item.find('addr1') is not None else ''
            addr2 = item.find('addr2').text if item.find('addr2') is not None else ''
            address_parts = [addr1, addr2]
            data['addr'] = ' '.join(filter(None, address_parts)) or 'N/A'
            data["cat"] = item.find('cat1').text if item.find('cat1') is not None else 'N/A'
            data['x'] = item.find('mapx').text if item.find('mapx') is not None else "N/A"
            data['y'] = item.find('mapy').text if item.find('mapy') is not None else "N/A"
            page_data.append(data)
                
        return page_data

    except requests.exceptions.HTTPError as e:
        print(f"🚨 HTTP Error fetching page {page_num}: {e}")
        print(f"URL: {request_url}")
        return []
    except requests.exceptions.RequestException as e:
        print(f"🚨 Network/Connection Error fetching page {page_num}: {e}")
        return []
    except ET.ParseError:
        print(f"🚨 XML Parse Error for page {page_num}. Content: {response.text[:200]}...") # 에러 내용 일부 출력
        return []
    except Exception as e:
        print(f"🚨 An unexpected error occurred for page {page_num}: {e}")
        return []

# total_count = 12894, rows_per_page = 12
def fetch_all_data(total_count, rows_per_page, contentTypeId):
    """
    모든 페이지를 반복하며 데이터를 가져오는 메인 함수
    """
    total_pages = math.ceil(total_count / rows_per_page)
    all_data = []
    
    print(f"✨ 총 {total_count}건의 데이터, 페이지당 {rows_per_page}건, 총 {total_pages} 페이지를 가져옵니다.")
    
    for page_num in range(1, total_pages + 1):
        print(f"--- 🌐 현재 페이지: {page_num}/{total_pages} ---")
        page_data = fetch_page_data(page_num, rows_per_page, contentTypeId)
        all_data.extend(page_data)
        
        # API 서버에 과부하를 주지 않기 위해 잠시 대기 (선택 사항)
        time.sleep(2) 
        
    print(f"✅ 데이터 수집 완료. 총 {len(all_data)}건의 데이터를 가져왔습니다.")
    return all_data

def save_to_dataframe_and_csv(data_list, filename="tour_data.csv"):
    """
    수집된 리스트 데이터를 DataFrame으로 변환하고 CSV 파일로 저장합니다.
    """
    print("--- 💾 데이터 변환 및 저장 시작 ---")
    
    # 1. DataFrame 변환
    df = pd.DataFrame(data_list)
    
    # 3. CSV 파일 저장
    # encoding='utf-8-sig'는 한글 깨짐 및 엑셀에서 파일 열람 시 호환성을 높여줍니다.
    df.to_csv(filename, index=False, encoding='utf-8-sig')
    
    print(f"✅ 데이터프레임 변환 성공.")
    print(f"✅ {filename} 파일로 저장 완료. (총 {len(df)} 행)")
    print(df.head())
    
    return df

# 음식점 total 14126, 숙박 total 3590
TOTAL_COUNT = 8206
ROWS_PER_PAGE = 1000
CONTENT_TYPE_ID = 38

# 1. API 호출로 모든 데이터 수집
all_data_list = fetch_all_data(TOTAL_COUNT, ROWS_PER_PAGE, CONTENT_TYPE_ID)

# 2. 수집된 데이터를 DataFrame으로 변환하고 CSV로 저장
if all_data_list:
    final_df = save_to_dataframe_and_csv(all_data_list, filename="korea_tour_hotel.csv")
else:
    print("❌ 수집된 데이터가 없어 DataFrame 변환 및 저장을 건너뜁니다.")
    final_df = pd.DataFrame()
