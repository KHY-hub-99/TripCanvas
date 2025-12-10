import pandas as pd
import os
import sys


if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
print(BASE_DIR)
excel_path = os.path.join(BASE_DIR, "data", "tripdata.xlsx")
print(excel_path)

# 엑셀 파일 읽기 시 engine 명시 및 인코딩 처리
try:
    # openpyxl 엔진 사용 (xlsx 파일용)
    tripdata = pd.read_excel(excel_path, index_col=None, engine='openpyxl')
    print(tripdata)
    
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
        print(tripdata)
    except Exception as e2:
        print(f"대체 방법도 실패: {e2}")