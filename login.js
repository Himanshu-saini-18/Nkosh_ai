
const API_BASE = "https://nkoshcrm.com"; 


const requestOtpForm = document.getElementById("requestOtpForm");
const alertBox = document.getElementById("alertBox");
const sendOtpBtn = document.getElementById("sendOtpBtn");

function showAlert(type, msg) {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = msg;
  alertBox.classList.remove("d-none");
}

function hideAlert() {
  alertBox.classList.add("d-none");
}

function setLoading(isLoading) {
  sendOtpBtn.disabled = isLoading;
  sendOtpBtn.innerHTML = isLoading
    ? `Sending... <i class="bi bi-hourglass-split ms-2"></i>`
    : `Send OTP <i class="bi bi-arrow-right ms-2"></i>`;
}

function sanitizePhone(phone) {
  return (phone || "").replace(/\D/g, "").trim();
}

requestOtpForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  hideAlert();

  const name = document.getElementById("name").value.trim();
  const phoneNumberRaw = document.getElementById("phoneNumber").value;
  const phoneNumber = sanitizePhone(phoneNumberRaw);

  if (!name) {
    showAlert("warning", "Please Enter Your Full Name.");
    return;
  }

  if (phoneNumber.length !== 10) {
    showAlert("warning", "Please Enter A Valid 10 Digit Phone Number.");
    return;
  }

  setLoading(true);

  try {
    const url = new URL(`${API_BASE}/farmer/login/request-otp`);
    url.searchParams.set("name", name);
    url.searchParams.set("phoneNumber", phoneNumber);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    // If Your Server Returns 403 Due To CORS / Security, You Must Fix On Backend.
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data?.message || `Request Failed (${res.status})`;
      throw new Error(message);
    }

    if (data?.status === true) {
      // Save For OTP Page
      localStorage.setItem("nk_name", name);
      localStorage.setItem("nk_phone", phoneNumber);

      showAlert("success", data?.message || "OTP Sent Successfully.");

      // Redirect To OTP Page
      window.location.href = "otp.html";
    } else {
      showAlert("danger", data?.message || "Failed To Send OTP.");
    }
  } catch (err) {
    showAlert("danger", err.message || "Something Went Wrong.");
  } finally {
    setLoading(false);
  }
});
