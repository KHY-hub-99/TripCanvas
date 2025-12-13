const subOptionsData = {
  // 특별시 및 광역시 (일반적으로 1차 행정구역)
  서울특별시: [
    "강남구",
    "강동구",
    "강북구",
    "강서구",
    "관악구",
    "광진구",
    "구로구",
    "금천구",
    "노원구",
    "도봉구",
    "동대문구",
    "동작구",
    "마포구",
    "서대문구",
    "서초구",
    "성동구",
    "성북구",
    "송파구",
    "양천구",
    "영등포구",
    "용산구",
    "은평구",
    "종로구",
    "중구",
    "중랑구",
  ],
  인천광역시: [
    "강화군",
    "계양구",
    "남동구",
    "동구",
    "미추홀구",
    "부평구",
    "서구",
    "연수구",
    "옹진군",
    "중구",
    "태백시",
  ],
  대전광역시: ["대덕구", "동구", "서구", "속초시", "유성구", "중구"],
  대구광역시: [
    "군위군",
    "남구",
    "달서구",
    "달성군",
    "동구",
    "북구",
    "서구",
    "수성구",
    "중구",
    "청도군",
  ],
  광주광역시: ["광산구", "남구", "동구", "북구", "서구", "화순군"],
  부산광역시: [
    "강서구",
    "금정구",
    "기장군",
    "남구",
    "동구",
    "동래구",
    "부산진구",
    "북구",
    "사상구",
    "사하구",
    "서구",
    "수영구",
    "연제구",
    "영도구",
    "중구",
    "해운대구",
    "해운대구광역시",
  ],
  울산광역시: ["남구", "동구", "북구", "울주군", "중구"],
  세종특별자치시: ["세종특별자치시"],

  // 도 및 특별자치도 (일반적으로 1차 행정구역)
  경기도: [
    "가평군",
    "고양시",
    "과천시",
    "광명시",
    "광주시",
    "구리시",
    "군포시",
    "김포시",
    "남양주시",
    "동두천시",
    "부천시",
    "성남시",
    "수원시",
    "시흥시",
    "안산시",
    "안성시",
    "안양시",
    "양주시",
    "양평군",
    "여주시",
    "연천군",
    "오산시",
    "용인시",
    "의왕시",
    "의정부시",
    "이천시",
    "종로구",
    "파주시",
    "평택시",
    "포천시",
    "하남시",
    "화성시",
  ],
  강원특별자치도: [
    "강릉시",
    "고성군",
    "동해시",
    "삼척시",
    "속초시",
    "양구군",
    "양양군",
    "영월군",
    "원주시",
    "인제군",
    "정선군",
    "철원군",
    "춘천시",
    "태백시",
    "평창군",
    "홍천군",
    "화천군",
    "횡성군",
  ],
  충청북도: [
    "괴산군",
    "단양군",
    "보은군",
    "영동군",
    "옥천군",
    "음성군",
    "제천시",
    "제천시봉양읍",
    "증평군",
    "진천군",
    "청주시",
    "충주시",
  ],
  충청남도: [
    "계룡시",
    "공주시",
    "금산군",
    "논산시",
    "당진시",
    "보령시",
    "부여군",
    "서산시",
    "서천군",
    "아산시",
    "예산군",
    "천안",
    "천안시",
    "청양군",
    "태안군",
    "홍성군",
  ],
  경상북도: [
    "경산시",
    "경주시",
    "고령군",
    "구미시",
    "김천시",
    "문경시",
    "봉화군",
    "상주시",
    "성주군",
    "안동시",
    "영덕군",
    "영양군",
    "영주시",
    "영천시",
    "예천군",
    "울릉군",
    "울주군",
    "울진군",
    "의성군",
    "청도군",
    "청송군",
    "칠곡군",
    "포항시",
  ],
  경상남도: [
    "거제시",
    "거창군",
    "고성군",
    "김해시",
    "남해군",
    "밀양시",
    "사천시",
    "산청군",
    "양산시",
    "의령군",
    "진도군",
    "진주시",
    "창녕군",
    "창원시",
    "통영시",
    "하동군",
    "함안군",
    "함양군",
    "합천군",
    "홍천군",
  ],
  전북특별자치도: [
    "고창군",
    "군산시",
    "김제시",
    "남원시",
    "무주군",
    "부안군",
    "순창군",
    "완주군",
    "익산시",
    "임실군",
    "장수군",
    "전주시",
    "정읍시",
    "진안군",
  ],
  전라남도: [
    "강진군",
    "고흥군",
    "곡성군",
    "광양시",
    "구례군",
    "나주시",
    "담양군",
    "목포시",
    "무안군",
    "보성군",
    "순천시",
    "신안군",
    "여수시",
    "영광군",
    "영암군",
    "완도군",
    "장성군",
    "장흥군",
    "진도군",
    "함평군",
    "해남군",
    "홍성군",
    "화순군",
  ],
  제주특별자치도: ["서귀포시", "제주시"],
};

const mainSelection = document.getElementById("destination");
const subSelection = document.getElementById("sub-destination");

// 메인 선택이 변경되었을 때 실행될 이벤트 리스너
mainSelection.addEventListener("change", function () {
  // 1. 현재 메인 선택의 value (예: 'fruit', 'vegetable')를 가져옵니다.
  const selectedCategory = this.value;

  // 2. 세부 선택 (subSelection)의 기존 옵션을 모두 제거합니다.
  //    (첫 번째 기본 옵션 '메인 선택 후 고르세요'를 제외하고 모두 비웁니다.)
  subSelection.innerHTML = '<option value="">세부 항목을 선택하세요</option>';

  // 3. 선택된 카테고리에 해당하는 옵션 데이터(배열)를 가져옵니다.
  const options = subOptionsData[selectedCategory];

  // 4. options 배열이 존재하고 내용이 있을 경우에만 새로운 옵션을 추가합니다.
  if (options && options.length > 0) {
    // 5. 배열을 순회하며 `<option>` 요소를 생성하고 subSelection에 추가합니다.
    options.forEach(function (item) {
      const newOption = document.createElement("option");
      newOption.value = item; // 값(value)으로도 항목 이름 사용
      newOption.textContent = item; // 화면에 표시될 텍스트
      subSelection.appendChild(newOption);
    });
  } else {
    // 선택된 카테고리에 데이터가 없거나, '선택하세요' 상태일 경우
    subSelection.innerHTML =
      '<option value="">선택 가능한 항목이 없습니다</option>';
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // 1. 칩 컨테이너와 입력 필드 가져오기
  const chipsContainer = document.getElementById("travel-style-chips");
  const hiddenInput = document.getElementById("selected-styles"); // 선택 사항

  if (!chipsContainer) return;

  // 2. 칩 클릭 이벤트 리스너 설정
  chipsContainer.addEventListener("click", (e) => {
    const clickedChip = e.target.closest(".chip");

    // 클릭된 요소가 칩(.chip)인지 확인
    if (clickedChip) {
      // 칩의 선택 상태 토글
      clickedChip.classList.toggle("selected");

      // 3. 현재 선택된 모든 칩의 값을 수집
      updateSelectedStyles();
    }
  });

  // 초기 로드 시 한 번 실행
  updateSelectedStyles();

  function updateSelectedStyles() {
    const selectedChips = chipsContainer.querySelectorAll(".chip.selected");
    let selectedValues = [];

    selectedChips.forEach((chip) => {
      // data-value 속성에 저장된 값을 사용하거나, 없으면 칩의 텍스트를 사용
      const value = chip.getAttribute("data-value") || chip.textContent.trim();
      selectedValues.push(value);
    });

    // 4. 수집된 값을 배열 또는 쉼표 구분 문자열로 변수에 저장
    // Node.js 서버로 보낼 때는 파이썬이 처리하기 쉽게 '쉼표(,) 구분 문자열'이 좋습니다.
    const resultString = selectedValues.join(", ");

    // 5. 숨겨진 입력 필드 업데이트 (폼 제출 시 자동으로 포함됨)
    if (hiddenInput) {
      hiddenInput.value = resultString;
    }

    // 6. 콘솔 확인 (디버깅 용)
    console.log("현재 선택된 여행 스타일:", resultString);

    // 만약 폼 제출 데이터에 포함시키지 않고 JavaScript 변수로만 쓰고 싶다면:
    // window.currentSelectedThemes = selectedValues;
  }
});

const generatePlanButton = document.getElementById("btn-generate");
generatePlanButton.addEventListener("click", async () => {
  // 사용자가 입력한 모든 여행 정보를 객체로 수집
  const token = localStorage.getItem("Token");
  const tripData = {
    start_loc: document.getElementById("departure").value,
    end_area: document.getElementById("destination").value,
    detail_addr: document.getElementById("sub-destination").value,
    start_date: document.getElementById("start-date").value, // YYYY-MM-DD 형식으로 가정
    end_date: document.getElementById("end-date").value,
    budget_per_person: parseInt(
      document.getElementById("personal-budget").value
    ),
    total_people: parseInt(document.getElementById("people-count").value),
    place_themes: document.getElementById("selected-styles").value, // 쉼표 구분 문자열
    accommodation_theme: "숙소", // 또는 계산된 값
  };

  try {
    const response = await fetch("http://localhost:8080/api/plan/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("Token")}`, // 로그인 토큰이 있다면 추가
      },
      body: JSON.stringify(tripData),
    });

    if (response.ok) {
      const planResult = await response.json();
      console.log("여행 계획 생성 성공:", planResult);
      // 사용자 화면에 계획을 표시하는 로직 추가
    } else {
      const errorData = await response.json();
      alert(`계획 생성 실패: ${errorData.message}`);
    }
  } catch (error) {
    console.error("통신 오류:", error);
    alert("서버 통신 중 오류가 발생했습니다.");
  }
});
