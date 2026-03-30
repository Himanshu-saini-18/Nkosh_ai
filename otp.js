
const API_BASE = "https://nkoshcrm.com";


const verifyOtpForm = document.getElementById("verifyOtpForm");
const alertBox = document.getElementById("alertBox");
const verifyBtn = document.getElementById("verifyBtn");
const resendBtn = document.getElementById("resendBtn");
const showPhone = document.getElementById("showPhone");
const timerText = document.getElementById("timerText");

const phoneNumber = localStorage.getItem("nk_phone") || "";
const name = localStorage.getItem("nk_name") || "";

if (!phoneNumber) {

  window.location.href = "login.html";
}

showPhone.textContent = phoneNumber ? `+91 ${phoneNumber}` : "Your Number";

function showAlert(type, msg) {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = msg;
  alertBox.classList.remove("d-none");
}

function hideAlert() {
  alertBox.classList.add("d-none");
}

function setVerifyLoading(isLoading) {
  verifyBtn.disabled = isLoading;
  verifyBtn.innerHTML = isLoading
    ? `Verifying... <i class="bi bi-hourglass-split ms-2"></i>`
    : `Verify & Login <i class="bi bi-arrow-right ms-2"></i>`;
}


let secondsLeft = 30;
let timer = null;

function startResendTimer() {
  secondsLeft = 30;
  resendBtn.disabled = true;

  if (timer) clearInterval(timer);

  timerText.textContent = `You Can Resend OTP In ${secondsLeft}s`;

  timer = setInterval(() => {
    secondsLeft--;
    timerText.textContent = `You Can Resend OTP In ${secondsLeft}s`;

    if (secondsLeft <= 0) {
      clearInterval(timer);
      timerText.textContent = "";
      resendBtn.disabled = false;
    }
  }, 1000);
}

startResendTimer();

verifyOtpForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  hideAlert();

  const otp = document.getElementById("otp").value.trim();

  if (otp.length < 4) {
    showAlert("warning", "Please Enter Valid OTP.");
    return;
  }

  setVerifyLoading(true);

  try {
    const url = new URL(`${API_BASE}/farmer/login/verify-otp`);
    url.searchParams.set("phoneNumber", phoneNumber);
    url.searchParams.set("otp", otp);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data?.message || `Verify Failed (${res.status})`;
      throw new Error(message);
    }

    if (data?.status === true && data?.token) {
  localStorage.setItem("nk_token", data.token);
  localStorage.setItem("nk_farmerId", String(data.farmerId ?? ""));
  localStorage.setItem("nk_phone", data.phoneNumber ?? phoneNumber);
  localStorage.setItem("nk_name", data.name ?? name);

  showAlert("success", data?.message || "Login Successful.");


  const redirect = localStorage.getItem("nk_redirect_after_login");
  if (redirect) {
    localStorage.removeItem("nk_redirect_after_login");
    window.location.href = redirect;   
  } else {
    window.location.href = "kisaan.ai.html";
  }
} else {
  showAlert("danger", data?.message || "Invalid OTP.");
}

  } catch (err) {
    showAlert("danger", err.message || "Something Went Wrong.");
  } finally {
    setVerifyLoading(false);
  }
});

resendBtn.addEventListener("click", async function () {
  hideAlert();
  resendBtn.disabled = true;

  try {
    const url = new URL(`${API_BASE}/farmer/login/request-otp`);
    url.searchParams.set("name", name || "Farmer");
    url.searchParams.set("phoneNumber", phoneNumber);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { Accept: "application/json" },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data?.message || `Resend Failed (${res.status})`;
      throw new Error(message);
    }

    if (data?.status === true) {
      showAlert("success", data?.message || "OTP Resent Successfully.");
      startResendTimer();
    } else {
      showAlert("danger", data?.message || "Failed To Resend OTP.");
      resendBtn.disabled = false;
    }
  } catch (err) {
    showAlert("danger", err.message || "Something Went Wrong.");
    resendBtn.disabled = false;
  }
});
