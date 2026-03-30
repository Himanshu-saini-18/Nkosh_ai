// auth.js
(function () {
  const authBtn = document.getElementById("authBtn");
  const authIcon = document.getElementById("authIcon");
  if (!authBtn || !authIcon) return;

  const token = localStorage.getItem("nk_token");

  if (token) {
    authIcon.className = "bi bi-box-arrow-right fs-5";
    authBtn.title = "Logout";

    authBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("nk_token");
      localStorage.removeItem("nk_farmerId");
      localStorage.removeItem("nk_name");
      localStorage.removeItem("nk_phone");
      window.location.href = "login.html";
    });
  } else {
    authIcon.className = "bi bi-person fs-5";
    authBtn.title = "Login";

    authBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.setItem("nk_redirect_after_login", "kisaan.ai.html");
      window.location.href = "login.html";
    });
  }
})();
