// client/pages/Login.mjs
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userid = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userid, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // JWT 토큰을 localStorage에 저장
        localStorage.setItem("Token", data.token);
        alert("로그인 성공! " + data.nickname + "님 환영합니다.");
        // 요구사항: 로그인 성공 시 main.html로 이동
        window.location.href = "main.html";
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("서버와 통신 중 오류 발생");
    }
  });
}
