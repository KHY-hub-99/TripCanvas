// client/pages/Landing.mjs
// 메인 페이지 진입 시 인증 상태를 확인하고 필요한 정보를 로드합니다.

const checkAuthAndLoad = async () => {
  const token = localStorage.getItem("Token");

  if (!token) {
    // 토큰이 없으면 로그인 페이지로 강제 이동
    alert("로그인이 필요합니다.");
    window.location.href = "login.html";
    return;
  }

  // 토큰이 있으면 사용자 정보 등을 서버에서 가져와 페이지를 로드하는 로직 (예시)
  try {
    const response = await fetch("/api/users/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // 인증 미들웨어를 통과하기 위해 토큰 전송
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log("User Profile:", data);
    } else {
      // 토큰이 만료되었거나 유효하지 않은 경우
      localStorage.removeItem("Token"); // 만료된 토큰 제거
      alert("인증 정보가 만료되었습니다. 다시 로그인해 주세요.");
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Failed to load profile:", error);
    alert("사용자 정보 로드 중 오류가 발생했습니다.");
    // window.location.href = 'login.html';
  }
};

const logoutButton = document.getElementById("logout-button");
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("userToken");
    alert("로그아웃되었습니다.");
    window.location.href = "login.html";
  });
}

// 페이지 로드 시 실행
checkAuthAndLoad();
