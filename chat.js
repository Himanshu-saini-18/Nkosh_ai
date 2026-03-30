const kBaseUrl = "https://api.deepseek.com";
const kChatCompletionsPath = "/chat/completions";
const kModel = "deepseek-chat";

// Frontend me API key rakhna unsafe hai.
// Better hai backend proxy use karo.
const API_KEY = "sk-67470a479b234e7a81fec56a2316c47d";

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearChatBtn = document.getElementById("clearChatBtn");

const trialModalEl = document.getElementById("trialOverModal");
const goLoginBtn = document.getElementById("goLoginBtn");
let trialModal = null;

const STORAGE_KEY = "nk_chat_state_v1";

const DEFAULT_WELCOME_MESSAGE =
  "👋 Namaste! Main Nkosh Kisaan Ai Hoon. Aap Crop, Mandi Rate, Fertilizer Ya Farming Se Related Sawal Pooch Sakte Hain.";

const SYSTEM_PROMPT = `
You Are Nkosh AI, An Agriculture Assistant For Indian Farmers.

Core Rules:
1. Always Reply In The Same Language And Same Script Style As The User's Latest Message.
2. If User Writes In Hindi Script, Reply In Hindi Script Only.
3. If User Writes In Roman Hindi Or Hinglish, Reply In Roman Hindi Or Hinglish Only.
4. If User Writes In English, Reply In English Only.
5. If User Writes In Bhojpuri, Reply Strictly In Bhojpuri Using The Same Script Style.
6. Never Change The User's Language Or Script Style On Your Own.
7. Never Mix Languages Unless The User Explicitly Asks.
8. Plain Text Only.
9. Do Not Use Markdown, Bullets, Numbering, Or Symbols Like *, #, -, •.

Response Rules:
10. Response Must Be Between 10 To 20 Lines.
11. Each Line Must Be On A New Line.
12. Each Line Must Add New Information.
13. Avoid Repeating Any Word, Sentence, Phrase, Or Idea Unnecessarily.
14. Keep Response Natural, Practical, And Easy For Indian Farmers To Understand.
15. Prefer Clear Step By Step Guidance In Simple Sentences.
16. If Any Repetition Is Detected, Regenerate Internally Before Answering.
17. Never Give A One Paragraph Reply When Multi Line Reply Is Requested.
18. Keep Every Line Short, Clear, And Useful.

Behavior Rules:
19. Focus On Real Farming Advice Like Crop, Fertilizer, Irrigation, Pest Control, Soil Health, Animal Care, And Mandi Insights.
20. Avoid Generic Or Theoretical Explanations.
21. Give Actionable Suggestions Farmers Can Apply Immediately.
`.trim();

const conversation = [
  {
    role: "system",
    content: SYSTEM_PROMPT
  }
];

/* =======================
   Helpers
======================= */
function getBaseConversation() {
  return [
    {
      role: "system",
      content: SYSTEM_PROMPT
    }
  ];
}

function resetConversation() {
  conversation.length = 0;
  conversation.push(...getBaseConversation());
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createBubbleHtml(text, sender) {
  const wrapperClass = sender === "user" ? "mb-2 text-end" : "mb-2 text-start";
  const bubbleClass = sender === "user" ? "chat-bubble user" : "chat-bubble bot";

  return `
    <div class="${wrapperClass}">
      <div class="d-inline-block px-3 py-2 rounded-4 ${bubbleClass}" style="animation: fadeUp .25s ease;">
        ${escapeHtml(text)}
      </div>
    </div>
  `;
}

function renderDefaultWelcome() {
  chatBox.innerHTML = createBubbleHtml(DEFAULT_WELCOME_MESSAGE, "bot");
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTypingBubbleIfAny() {
  const typingBubble = chatBox.querySelector('[data-typing="true"]');
  if (typingBubble) typingBubble.remove();
}

function saveChatState() {
  try {
    const state = {
      conversation,
      html: chatBox?.innerHTML || "",
      ts: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Save Chat Failed", e);
  }
}

function loadChatState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Load Chat Failed", e);
    return null;
  }
}

function restoreChatState() {
  const state = loadChatState();

  if (!state) {
    resetConversation();
    renderDefaultWelcome();
    return;
  }

  if (Array.isArray(state.conversation) && state.conversation.length) {
    conversation.length = 0;
    state.conversation.forEach((m) => conversation.push(m));
  } else {
    resetConversation();
  }

  if (chatBox && typeof state.html === "string" && state.html.trim()) {
    chatBox.innerHTML = state.html;
    removeTypingBubbleIfAny();

    if (!chatBox.innerHTML.trim()) {
      renderDefaultWelcome();
    }
  } else {
    renderDefaultWelcome();
  }

  chatBox.scrollTop = chatBox.scrollHeight;
  saveChatState();
}

function clearChat() {
  localStorage.removeItem(STORAGE_KEY);
  resetConversation();
  renderDefaultWelcome();
  userInput.value = "";
  userInput.focus();
  saveChatState();
}

/* =======================
   Trial UI Handling
======================= */
function lockChatUI() {
  userInput.disabled = true;
  sendBtn.disabled = true;
  if (clearChatBtn) clearChatBtn.disabled = true;
  userInput.placeholder = "Trial Ended. Please Login...";
}

function showTrialOverPopup() {
  lockChatUI();
  if (trialModalEl) {
    if (!trialModal) trialModal = new bootstrap.Modal(trialModalEl);
    trialModal.show();
  }
}

function checkTrialOnLoad() {
  if (typeof isTrialOver === "function" && isTrialOver()) {
    showTrialOverPopup();
  }
}

goLoginBtn?.addEventListener("click", () => {
  saveChatState();
  localStorage.setItem("nk_redirect_after_login", "chat.html");
  window.location.href = "login.html";
});

/* =======================
   Language Detection
======================= */
function detectLang(text) {
  const t = (text || "").trim();
  const lower = t.toLowerCase();

  if (!t) return "English";

  if (/[\u0980-\u09FF]/.test(t)) return "Bengali";
  if (/[\u0A80-\u0AFF]/.test(t)) return "Gujarati";
  if (/[\u0B00-\u0B7F]/.test(t)) return "Odia";
  if (/[\u0B80-\u0BFF]/.test(t)) return "Tamil";
  if (/[\u0D00-\u0D7F]/.test(t)) return "Malayalam";
  if (/[\u0A00-\u0A7F]/.test(t)) return "Punjabi";
  if (/[\u0600-\u06FF]/.test(t)) return "Urdu";

  if (/[\u0900-\u097F]/.test(t)) {
    const marathiHints = ["आहे", "नाही", "काय", "कसा", "कशी", "कुठे", "झाले", "होते", "म्हणजे"];
    if (marathiHints.some((w) => t.includes(w))) return "Marathi";

    const bhojpuriHints = ["रउआ", "हमनी", "तोहरा", "तोहके", "कइसे", "कइसन", "भइल", "होखे", "बाटे"];
    if (bhojpuriHints.some((w) => t.includes(w))) return "Bhojpuri";

    return "Hindi";
  }

  if (/[A-Za-z]/.test(t)) {
    const hinglishHints = [
      "mujhe", "mujhko", "mera", "meri", "mere", "kya", "kaise", "kyu", "kyon",
      "kaun", "kab", "kahan", "batao", "bataye", "btao", "krna", "karna", "karu",
      "pani", "fasal", "beej", "gobar", "gaay", "gai", "gay", "kheti", "dawai",
      "khad", "kitna", "kaunsi", "kaunsa", "chahiye", "hai", "hain", "ho", "hoga",
      "kr", "nahi", "nahin", "acha", "accha", "samjhao", "upay", "ilaaj", "bakri",
      "bhains", "mitti", "zameen", "faslon", "gobar", "chara", "doodh", "pashu"
    ];

    const englishHints = [
      "how", "what", "when", "where", "why", "which", "can", "could", "should",
      "do", "does", "is", "are", "soil", "testing", "fertilizer", "crop", "disease",
      "water", "weather", "please", "tell", "explain", "animal", "cow", "buffalo",
      "farm", "seed", "spray", "pesticide"
    ];

    const hinglishScore = hinglishHints.filter((w) => lower.includes(w)).length;
    const englishScore = englishHints.filter((w) => lower.includes(w)).length;

    if (hinglishScore > 0 && hinglishScore >= englishScore) return "Hinglish";
    return "English";
  }

  return "English";
}

function getLanguageInstruction(lang) {
  const map = {
    Hindi: "Reply Strictly In Hindi Script Only.",
    Hinglish: "Reply Strictly In Hinglish Only Using English Letters. Do Not Use Hindi Script.",
    Bhojpuri: "Reply Strictly In Bhojpuri Only And Match The User Writing Style.",
    Marathi: "Reply Strictly In Marathi Only.",
    Bengali: "Reply Strictly In Bengali Only.",
    Gujarati: "Reply Strictly In Gujarati Only.",
    Odia: "Reply Strictly In Odia Only.",
    Tamil: "Reply Strictly In Tamil Only.",
    Malayalam: "Reply Strictly In Malayalam Only.",
    Punjabi: "Reply Strictly In Punjabi Only.",
    Urdu: "Reply Strictly In Urdu Only.",
    English: "Reply Strictly In English Only."
  };

  return map[lang] || "Reply Strictly In English Only.";
}

/* =======================
   UI Helpers
======================= */
function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = sender === "user" ? "mb-2 text-end" : "mb-2 text-start";
  const bubbleClass = sender === "user" ? "chat-bubble user" : "chat-bubble bot";

  div.innerHTML = `
    <div class="d-inline-block px-3 py-2 rounded-4 ${bubbleClass}" style="animation: fadeUp .25s ease;">
      ${escapeHtml(text)}
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  saveChatState();
}

function addTypingMessage() {
  const div = document.createElement("div");
  div.className = "mb-2 text-start";
  div.setAttribute("data-typing", "true");

  div.innerHTML = `
    <div class="d-inline-block px-3 py-2 rounded-4 chat-bubble bot" style="animation: fadeUp .25s ease;">
      Typing...
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* =======================
   API Call
======================= */
async function callDeepSeek(messages) {
  if (!API_KEY || API_KEY.trim() === "") {
    throw new Error("Missing API Key");
  }

  const response = await fetch(`${kBaseUrl}${kChatCompletionsPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: kModel,
      messages,
      temperature: 0.35
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || data?.message || "Error Connecting To Server";
    throw new Error(msg);
  }

  return data?.choices?.[0]?.message?.content?.trim() || "No Response Received";
}

/* =======================
   Trim Conversation
======================= */
const MAX_MSGS = 16;

function trimConversation() {
  if (!Array.isArray(conversation) || conversation.length <= 1) return;

  const base = [conversation[0]];
  const rest = conversation.slice(1);
  const keep = rest.slice(-MAX_MSGS);

  conversation.length = 0;
  conversation.push(...base, ...keep);
}

/* =======================
   Send Message
======================= */
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  if (typeof isTrialOver === "function" && isTrialOver()) {
    showTrialOverPopup();
    return;
  }

  addMessage(message, "user");
  userInput.value = "";
  addTypingMessage();

  try {
    const lang = detectLang(message);
    const langInstruction = getLanguageInstruction(lang);

    conversation.push({
      role: "user",
      content: `${langInstruction}
Match The User's Exact Writing Style.
If The User Writes In Roman Hindi, Reply In Roman Hindi.
If The User Writes In Hindi Script, Reply In Hindi Script.
If The User Writes In English, Reply In English.
Do Not Switch Script.
Do Not Mix Languages.
Answer In Plain Text Only.
Do Not Use Bullets, Numbering, Markdown, Or Special Symbols.
Keep The Response Helpful, Natural, And Easy To Understand.
Avoid Repeating The Same Idea.
User Question: ${message}`
    });

    saveChatState();

    const reply = await callDeepSeek(conversation);

    removeTypingBubbleIfAny();

    conversation.push({
      role: "assistant",
      content: reply
    });

    addMessage(reply, "bot");
    trimConversation();
    saveChatState();

    if (typeof consumeTrialOnce === "function") {
      const result = consumeTrialOnce();
      if (result?.over) {
        showTrialOverPopup();
      }
    }
  } catch (error) {
    removeTypingBubbleIfAny();

    if (String(error?.message || "").toLowerCase().includes("missing api key")) {
      addMessage("API Key Missing Hai. Please Backend Ya Secure Config Se API Key Add Karo.", "bot");
    } else {
      addMessage("Error Connecting To Server", "bot");
    }

    console.error(error);
  }
}

/* =======================
   Events
======================= */
sendBtn?.addEventListener("click", sendMessage);

userInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

clearChatBtn?.addEventListener("click", clearChat);

/* =======================
   Init
======================= */
restoreChatState();
checkTrialOnLoad();