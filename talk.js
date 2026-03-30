const kBaseUrl = "https://api.deepseek.com";
const kChatCompletionsPath = "/chat/completions";
const kModel = "deepseek-chat";


const API_KEY = "sk-67470a479b234e7a81fec56a2316c47d";

let currentLocale = "hi-IN";
let currentTtsLang = "hi-IN";
let autoSpeak = true;

const statusBadge = document.getElementById("statusBadge");
const localeText = document.getElementById("localeText");
const toggleLocaleBtn = document.getElementById("toggleLocale");
const toggleAutoSpeakBtn = document.getElementById("toggleAutoSpeak");

const transcriptText = document.getElementById("transcriptText");
const aiReplyText = document.getElementById("aiReplyText");

const holdToTalkBtn = document.getElementById("holdToTalkBtn");
const speakBtn = document.getElementById("speakBtn");
const clearBtn = document.getElementById("clearBtn");

const trialModalEl = document.getElementById("trialOverModal");
const goLoginBtn = document.getElementById("goLoginBtn");
let trialModal = null;

function setStatus(text, type = "secondary") {
  statusBadge.className = `badge text-bg-${type} px-3 py-2 rounded-pill`;
  statusBadge.textContent = text;
}

function safeText(el, text) {
  el.textContent = text && String(text).trim() ? text : "—";
}

function stopSpeaking() {
  try { window.speechSynthesis.cancel(); } catch (_) {}
}

function lockUI() {
  holdToTalkBtn.disabled = true;
  speakBtn.disabled = true;
  clearBtn.disabled = true;
  setStatus("Trial Ended", "danger");
}

let isHolding = false;

function showTrialOverPopup() {
  isHolding = false;
  stopSpeaking();
  try { recognition && recognition.stop(); } catch (_) {}

  lockUI();

  if (trialModalEl) {
    if (!trialModal) trialModal = new bootstrap.Modal(trialModalEl);
    trialModal.show();
  }
}

function checkTrialOnLoad() {
  if (isTrialOver()) showTrialOverPopup();
}

goLoginBtn?.addEventListener("click", () => {
  localStorage.setItem("nk_redirect_after_login", "talk.html");
  window.location.href = "login.html";
});



function detectLang(text) {
  const t = (text || "").trim();
  const low = t.toLowerCase();

  if (/[\u0980-\u09FF]/.test(t)) return "Bengali";
  if (/[\u0A80-\u0AFF]/.test(t)) return "Gujarati";
  if (/[\u0B00-\u0B7F]/.test(t)) return "Odia";
  if (/[\u0B80-\u0BFF]/.test(t)) return "Tamil";
  if (/[\u0D00-\u0D7F]/.test(t)) return "Malayalam";
  if (/[\u0A00-\u0A7F]/.test(t)) return "Punjabi";
  if (/[\u0C80-\u0CFF]/.test(t)) return "Kannada";
  if (/[\u0600-\u06FF]/.test(t)) return "Urdu";

  if (/[\u0900-\u097F]/.test(t)) {
    const marathiHints = ["आहे", "नाही", "काय", "कसा", "कशी", "कुठे", "झाले", "होते", "करा", "म्हणजे"];
    if (marathiHints.some(w => t.includes(w))) return "Marathi";

    const bhojpuriHints = ["रउआ", "हमनी", "तोहरा", "तोहके", "कइसे", "कइसन", "कहाँ", "भइल", "होखे", "देवे", "जाई", "बाटे"];
    if (bhojpuriHints.some(w => t.includes(w))) return "Bhojpuri";

    return "Hindi";
  }

  if (/[A-Za-z]/.test(t)) return "English";
  return "English";
}

function langToTtsLocale(lang) {
  switch (lang) {
    case "English": return "en-US";
    case "Hindi": return "hi-IN";
    case "Bengali": return "bn-IN";
    case "Marathi": return "mr-IN";
    case "Tamil": return "ta-IN";
    case "Gujarati": return "gu-IN";
    case "Urdu": return "ur-PK";
    case "Kannada": return "kn-IN";
    case "Odia": return "or-IN";
    case "Malayalam": return "ml-IN";
    case "Punjabi": return "pa-IN";
    case "Bhojpuri": return "hi-IN"; 
    default: return "hi-IN";
  }
}

function langToSttLocale(lang) {

  switch (lang) {
    case "English": return "en-US";
    case "Hindi": return "hi-IN";
    case "Bengali": return "bn-IN";
    case "Marathi": return "mr-IN";
    case "Tamil": return "ta-IN";
    case "Gujarati": return "gu-IN";
    case "Urdu": return "ur-PK";
    case "Kannada": return "kn-IN";
    case "Odia": return "or-IN";
    case "Malayalam": return "ml-IN";
    case "Punjabi": return "pa-IN";
    case "Bhojpuri": return "hi-IN";
    default: return currentLocale || "hi-IN";
  }
}



const conversation = [
  {
    role: "system",
    content:
      "You are Nkosh AI, an agriculture assistant for Indian farmers. Response must be 3 to 4 lines only. Plain text only. Do not use any special characters like *, #, -, •, bullets, numbering, or markdown. IMPORTANT: Always follow the latest system instruction that says 'Reply strictly in <LANG>'. Do not mix languages."
  }
];



const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let lastFinalText = "";
let latestCombinedText = "";

function initRecognition() {
  if (!SpeechRecognition) return null;

  const r = new SpeechRecognition();
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 1;
  r.lang = currentLocale;

  r.onstart = () => setStatus("Listening...", "warning");

  r.onresult = (event) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += t + " ";
      else interim += t;
    }

    latestCombinedText = (final + interim).trim();
    safeText(transcriptText, latestCombinedText || "—");

    if (final.trim()) lastFinalText = (lastFinalText + " " + final).trim();
  };

  r.onerror = (e) => {
    console.error("Speech Recognition Error:", e);

    if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
      setStatus("Mic Permission Denied", "danger");
    } else if (e?.error === "no-speech") {
      setStatus("No Speech Detected", "secondary");
    } else {
      setStatus("Mic Error", "danger");
    }

    if (isHolding) {
      try { r.stop(); } catch (_) {}
      setTimeout(() => {
        if (isHolding) {
          try { r.start(); } catch (_) {}
        }
      }, 350);
    }
  };

  r.onend = () => {
    if (isHolding) {
      setTimeout(() => {
        if (isHolding) {
          try { r.start(); } catch (_) {}
        }
      }, 200);
    }
  };

  return r;
}


async function callDeepSeek(userMessage) {
  if (!API_KEY) throw new Error("Missing API Key");


  const lang = detectLang(userMessage);
  const forcedTts = langToTtsLocale(lang);

  conversation.push({
    role: "system",
    content: `Reply strictly in ${lang} only. If ${lang} is Bhojpuri, reply in pure Bhojpuri (not Hindi). Plain text only. 3 to 4 lines only. No bullets, no numbering, no symbols like *, #, -, •.`
  });

  conversation.push({ role: "user", content: userMessage });

  const res = await fetch(`${kBaseUrl}${kChatCompletionsPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: kModel,
      messages: conversation,
      temperature: 0.7
    })
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || "Error Connecting To Server";
    throw new Error(msg);
  }

  const reply = data?.choices?.[0]?.message?.content?.trim() || "No Response Received";

  conversation.push({ role: "assistant", content: reply });

 
  const MAX_MSGS = 16;
  if (conversation.length > MAX_MSGS) {
    conversation.splice(1, conversation.length - MAX_MSGS);
  }

  currentTtsLang = forcedTts;

  return reply;
}



function speakReply() {
  const text = (aiReplyText.textContent || "").trim();
  if (!text || text === "—" || text === "Typing...") return;

  stopSpeaking();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = currentTtsLang;

  utter.onstart = () => setStatus("Speaking...", "primary");
  utter.onend = () => setStatus("Done", "success");
  utter.onerror = () => setStatus("TTS Error", "danger");

  window.speechSynthesis.speak(utter);
}


async function sendToDeepSeek(text) {
  const q = (text || "").trim();
  if (!q) {
    setStatus("Idle", "secondary");
    return;
  }

  if (isTrialOver()) {
    showTrialOverPopup();
    return;
  }

  try {
    safeText(aiReplyText, "Typing...");
    speakBtn.disabled = true;
    setStatus("Processing...", "info");

    const reply = await callDeepSeek(q);

    safeText(aiReplyText, reply);
    speakBtn.disabled = false;
    setStatus("Done", "success");

    const result = consumeTrialOnce();
    if (result.over) {
      showTrialOverPopup();
      return;
    }

    if (autoSpeak) speakReply();
  } catch (err) {
    console.error(err);

    if (String(err?.message || "").toLowerCase().includes("missing api key")) {
      safeText(aiReplyText, "API Key Missing. Please Add DeepSeek API Key In talk.js");
    } else {
      safeText(aiReplyText, "Error Connecting To Server");
    }

    speakBtn.disabled = true;
    setStatus("Error", "danger");
  }
}


function applyLocaleUI() {
  localeText.textContent = currentLocale;

  if (currentLocale === "hi-IN") {
    toggleLocaleBtn.textContent = "Switch To English";
    currentTtsLang = "hi-IN";
  } else {
    toggleLocaleBtn.textContent = "Switch To Hindi";
    currentTtsLang = "en-US";
  }
}

toggleLocaleBtn.addEventListener("click", () => {
  isHolding = false;
  stopSpeaking();

  try { recognition && recognition.stop(); } catch (_) {}

  currentLocale = currentLocale === "hi-IN" ? "en-US" : "hi-IN";
  applyLocaleUI();

  recognition = initRecognition();

  setStatus("Idle", "secondary");
  holdToTalkBtn.disabled = false;
  speakBtn.disabled = false;
});

toggleAutoSpeakBtn.addEventListener("click", () => {
  autoSpeak = !autoSpeak;
  toggleAutoSpeakBtn.textContent = `Auto Speak: ${autoSpeak ? "On" : "Off"}`;
});



function startHold() {
  if (isTrialOver()) {
    showTrialOverPopup();
    return;
  }

  if (!SpeechRecognition) {
    setStatus("Speech Not Supported (Use Chrome)", "danger");
    return;
  }

  isHolding = true;
  lastFinalText = "";
  latestCombinedText = "";

  stopSpeaking();
  safeText(transcriptText, "—");
  safeText(aiReplyText, "—");
  speakBtn.disabled = true;

  if (!recognition) recognition = initRecognition();
  recognition.lang = currentLocale;

  try { recognition.start(); } catch (_) {}

  setStatus("Listening...", "warning");
}

function endHold() {
  isHolding = false;
  setStatus("Processing...", "info");

  try { recognition && recognition.stop(); } catch (_) {}

  setTimeout(() => {
    const finalText = (lastFinalText || latestCombinedText || "").trim();
    safeText(transcriptText, finalText || "—");
    sendToDeepSeek(finalText);
  }, 300);
}

holdToTalkBtn.addEventListener("mousedown", startHold);
holdToTalkBtn.addEventListener("mouseup", endHold);
holdToTalkBtn.addEventListener("mouseleave", () => {
  if (isHolding) endHold();
});

holdToTalkBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  startHold();
});
holdToTalkBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  endHold();
});

speakBtn.addEventListener("click", speakReply);

clearBtn.addEventListener("click", () => {
  stopSpeaking();
  lastFinalText = "";
  latestCombinedText = "";
  safeText(transcriptText, "—");
  safeText(aiReplyText, "—");
  speakBtn.disabled = true;
  setStatus("Idle", "secondary");
});


applyLocaleUI();
toggleAutoSpeakBtn.textContent = `Auto Speak: ${autoSpeak ? "On" : "Off"}`;
recognition = initRecognition();
setStatus("Idle", "secondary");
checkTrialOnLoad();