
const TRIAL_LIMIT = 3;
const TRIAL_KEY = "nkosh_trial_total_used";

function isLoggedIn() {
  return !!localStorage.getItem("nk_token");
}

function getTrialCount() {
  return Number(localStorage.getItem(TRIAL_KEY) || "0");
}

function setTrialCount(n) {
  localStorage.setItem(TRIAL_KEY, String(n));
}

function isTrialOver() {
  if (isLoggedIn()) return false;
  return getTrialCount() >= TRIAL_LIMIT;
}

function consumeTrialOnce() {
  if (isLoggedIn()) {
    return { used: getTrialCount(), left: Math.max(0, TRIAL_LIMIT - getTrialCount()), over: false };
  }

  const used = getTrialCount() + 1;
  setTrialCount(used);

  return {
    used,
    left: Math.max(0, TRIAL_LIMIT - used),
    over: used >= TRIAL_LIMIT,
  };
}

function guardTrialNavigation(targetPage) {
  if (!isTrialOver()) return true;
  localStorage.setItem("nk_redirect_after_login", targetPage);
  window.location.href = "login.html";
  return false;
}
