import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as use from '@tensorflow-models/universal-sentence-encoder';

// --- CONFIGURATION ---
// 1. Your Remote Safe List (The "Truth Source")
const REMOTE_LIST_URL = "https://raw.githubusercontent.com/Digho007/clarity-ai-engine/refs/heads/main/safe_domains.json";

// 2. Your Google Safe Browsing API Key
const GOOGLE_API_KEY = "AIzaSyDfD9owYHX6lHV8jGXoE7ESW_XB8yJ1X3Q";

// 3. Update Frequency (24 Hours)
const UPDATE_INTERVAL_MINUTES = 1440;

// --- INITIALIZATION ---
if (typeof window === 'undefined') { self.window = self; }
console.log("🧠 Clarity Engine: INITIALIZING...");

let model = null;
let anchorTensors = {};

const ANCHOR_TEXTS = {
  login: "Please log in to your account. Click here to sign in. Verify your credentials. Job offer requiring login via Facebook.",
  money: "Wire transfer required. Update payment details. Credit card verification needed. Urgent request to avoid financial loss."
};

// --- HYBRID SAFE LIST (Hardcoded Fallback + Remote) ---
// We start with a strong default list so the extension works immediately after install.
let safeDomains = [
  "google.com", "gmail.com", "youtube.com", "docs.google.com", "drive.google.com",
  "microsoft.com", "outlook.com", "hotmail.com", "live.com", "office.com", "teams.microsoft.com",
  "apple.com", "icloud.com", "yahoo.com", "protonmail.com",
  "linkedin.com", "facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com",
  "whatsapp.com", "pinterest.com", "reddit.com", "slack.com", "discord.com",
  "indeed.com", "glassdoor.com", "monster.com", "ziprecruiter.com", "greenhouse.io", "lever.co",
  "calendly.com", "zoom.us", "atlassian.net", "trello.com", "asana.com", "notion.so",
  "monday.com", "clickup.com", "airtable.com", "docusign.com", "dropbox.com", "box.com",
  "wetransfer.com", "hubspot.com", "salesforce.com", "github.com", "gitlab.com",
  "amazon.com", "paypal.com", "stripe.com", "shopify.com", "ebay.com", "louisvuitton.com",
  "gomycode.com"
];

// --- 1. SMART UPDATER (Fetches from your GitHub) ---
async function updateSafeList() {
  try {
    console.log("🔄 Checking for safe domain updates...");
    const response = await fetch(REMOTE_LIST_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const newList = await response.json();
    if (Array.isArray(newList) && newList.length > 0) {
      safeDomains = newList;
      chrome.storage.local.set({ cachedSafeDomains: newList });
      console.log(`✅ Safe List Updated from GitHub! Now tracking ${newList.length} domains.`);
    }
  } catch (error) {
    console.warn("⚠️ Could not fetch remote list (using cached/default):", error.message);
  }
}

// Load cached list on startup
chrome.storage.local.get(['cachedSafeDomains'], (result) => {
  if (result.cachedSafeDomains) {
    safeDomains = result.cachedSafeDomains;
    console.log("📂 Loaded cached domains from storage.");
  }
  updateSafeList();
});

// Schedule periodic updates
chrome.alarms.create("fetchDomains", { periodInMinutes: UPDATE_INTERVAL_MINUTES });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchDomains") updateSafeList();
});

// --- 2. TYPOSQUATTING GUARD (Levenshtein Distance) ---
// Detects if someone is faking a brand (e.g. "g0ogle.com" vs "google.com")
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function checkTyposquatting(hostname) {
  // We only check against high-value targets to save CPU
  const targets = ['google.com', 'facebook.com', 'linkedin.com', 'amazon.com', 'apple.com', 'microsoft.com', 'paypal.com'];
  
  for (let target of targets) {
    if (hostname.endsWith(target)) continue; // It's the real domain
    if (Math.abs(hostname.length - target.length) > 2) continue; // Length mismatch too big

    const dist = getLevenshteinDistance(hostname, target);
    // If distance is 1 or 2 (e.g. "gooogle.com"), it's a clone.
    if (dist > 0 && dist <= 2) {
      console.log(`🚨 Typosquatting detected: ${hostname} mimics ${target}`);
      return true; 
    }
  }
  return false;
}

// --- 3. LIVE REPUTATION CHECK (Google Safe Browsing API) ---
async function checkLiveReputation(url) {
  if (!GOOGLE_API_KEY) return "UNKNOWN";

  const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_API_KEY}`;
  const requestBody = {
    client: { clientId: "clarity-extension", clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url: url }]
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    const data = await response.json();
    
    // If "matches" exists, Google says it's bad.
    if (data.matches && data.matches.length > 0) {
      console.log(`🚨 Google Safe Browsing Flagged: ${url}`);
      return "DANGEROUS";
    }
    return "SAFE";
  } catch (error) {
    console.error("API Check Failed:", error);
    return "UNKNOWN";
  }
}

// --- 4. CORE AI ENGINE ---
async function loadModel() {
  await tf.setBackend('cpu');
  await tf.ready();
  model = await use.load();
  anchorTensors.login = (await model.embed([ANCHOR_TEXTS.login])).squeeze();
  anchorTensors.money = (await model.embed([ANCHOR_TEXTS.money])).squeeze();
  console.log("🧠 Engine Ready.");
}
loadModel();

function calculateSimilarity(vecA, vecB) {
  return tf.tidy(() => {
    const dot = tf.sum(tf.mul(vecA, vecB));
    const nA = tf.norm(vecA);
    const nB = tf.norm(vecB);
    return dot.div(tf.mul(nA, nB)).dataSync()[0];
  });
}

// --- 5. LINK ANALYSIS LOGIC (The "Judge") ---
async function analyzeLinks(links) {
  if (!links || links.length === 0) return 0;
  let score = 0;
  
  // Process all links in parallel
  await Promise.all(links.map(async (link) => {
    try {
      const url = new URL(link);
      const hostname = url.hostname.toLowerCase();

      // A. IP Address Check (Immediate Red Flag)
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        score += 5; 
        return;
      }

      // B. Shortener Check
      if (['bit.ly', 'tinyurl.com', 'goo.gl', 'is.gd', 't.co', 'ngrok'].some(s => hostname.includes(s))) {
        score += 3;
      }

      // C. Whitelist Check (The "Green Lane")
      const isSafe = safeDomains.some(d => hostname === d || hostname.endsWith('.' + d));
      if (isSafe) return; // Verified Safe - Stop checking this link

      // D. Typosquatting Check (The "Lookalike" Trap)
      if (checkTyposquatting(hostname)) {
        score += 8; // Massive penalty for fake domains
        return;
      }

      // E. Live Reputation Check (The "Cloud" Layer)
      // Only check API if we haven't already convicted it, to save API quota
      if (score < 5) {
        const apiVerdict = await checkLiveReputation(link);
        if (apiVerdict === "DANGEROUS") {
          score += 10; // Confirmed Malware/Phishing
        } else {
          score += 1; // Unknown domain penalty (reduced because API didn't flag it)
        }
      }

    } catch (e) { score += 1; }
  }));

  return Math.min(score, 10);
}

// --- 6. MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "analyze_context" && model) {
    (async () => {
      // 1. Analyze Text (AI)
      const embeddings = await model.embed([req.text]);
      const vec = embeddings.squeeze();
      const loginScore = calculateSimilarity(anchorTensors.login, vec);
      const moneyScore = calculateSimilarity(anchorTensors.money, vec);
      const intentScore = Math.max(loginScore, moneyScore);
      
      // 2. Analyze Links (Heuristic + API)
      const linkScore = await analyzeLinks(req.links);

      let isThreat = false;
      let finalScore = 0;
      let verdict = "Safe";

      // 3. The Verdict Matrix
      if (intentScore > 0.60) {
        isThreat = true;
        finalScore = intentScore * 10;
        verdict = "High-Risk Language (Scam Intent)";
      } else if (linkScore >= 4) {
        isThreat = true;
        finalScore = 8.5;
        verdict = "Dangerous Link Detected";
      } else if (intentScore > 0.45 && linkScore >= 2) {
        isThreat = true;
        finalScore = (intentScore * 10) + linkScore;
        verdict = "Suspicious Request + Unverified Link";
      }

      sendResponse({ isThreat, score: finalScore.toFixed(1), verdict });
      
      // Cleanup
      vec.dispose();
      embeddings.dispose();
    })();
    return true; // Keep channel open for async response
  }
});

// Heartbeat to keep service worker alive
setInterval(() => { chrome.runtime.getPlatformInfo(() => {}); }, 20000);
