// client/pages/SignUp.mjs
const signupForm = document.getElementById("signupForm");

const regex = {
  // 영문(소문자/대문자) 또는 숫자 조합, 4자 이상 20자 이하
  userid: /^[a-zA-Z0-9]{4,20}$/,
  // 영문 또는 한글 조합, 2자 이상 10자 이하
  nickname: /^[a-zA-Z가-힣]{2,10}$/,
  // 최소 8자, 최대 30자, 최소 하나의 영문자, 최소 하나의 숫자, 최소 하나의 특수문자 포함
  password:
    /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,30}$/,
};

// 🚨 유효성 검사 함수
const validateInputs = (userid, nickname, password, confirmPassword) => {
  // 1. ID 유효성 검사
  if (!regex.userid.test(userid)) {
    alert("사용자 ID: 영문/숫자 조합으로 4~20자 이내로 입력해주세요.");
    return false;
  }

  // 2. 닉네임 유효성 검사
  if (!regex.nickname.test(nickname)) {
    alert("닉네임: 영문/한글 조합으로 2~10자 이내로 입력해주세요.");
    return false;
  }

  // 3. 비밀번호 유효성 검사
  if (!regex.password.test(password)) {
    alert(
      "비밀번호: 영문, 숫자, 특수문자를 반드시 포함하여 8~30자 이내로 입력해주세요."
    );
    return false;
  }

  // 4. 비밀번호 일치 확인
  if (password !== confirmPassword) {
    alert("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
    return false;
  }

  return true; // 모든 검사 통과
};

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🚨 수정: ID를 HTML의 "username"에 맞게 수정
    const userid = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const nickname = document.getElementById("nickname").value.trim();
    const password = document.getElementById("password").value;
    // 🚨 수정: 비밀번호 확인 ID를 HTML의 "passwordConfirm"에 맞게 수정
    const confirmPassword = document.getElementById("passwordConfirm").value;
    const agreeTerms = document.getElementById("agreeTerms").checked;

    // 약관 동의 체크
    if (!agreeTerms) {
      alert("회원가입을 위해 이용약관 및 개인정보처리방침에 동의해야 합니다.");
      return;
    }

    // 유효성 검사
    if (!validateInputs(userid, nickname, password, confirmPassword)) {
      return; // 유효성 검사 실패 시 서버로 전송하지 않고 함수 종료
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userid, email, nickname, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("회원가입 성공: " + data.message);
        // 요구사항: 회원가입 성공 시 login.html로 이동
        window.location.href = "login.html";
      } else {
        alert("회원가입 실패: " + (data.message || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("서버와 통신 중 오류 발생");
    }
  });
}
