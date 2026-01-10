import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as use from '@tensorflow-models/universal-sentence-encoder';

if (typeof window === 'undefined') { self.window = self; }

console.log("🧠 Clarity Engine: INITIALIZING...");

let model = null;
let anchorTensors = {};

const ANCHOR_TEXTS = {
  login: "Please log in to your account. Click here to sign in. Verify your credentials. Job offer requiring login via Facebook or social media.",
  money: "Wire transfer required. Update payment details. Credit card verification needed. Urgent request to avoid financial loss."
};

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

function analyzeLinks(links) {
  if (!links || links.length === 0) return 0;
  let score = 0;
  const safe = ['linkedin.com', 'google.com', 'microsoft.com', 'zoom.us', 'facebook.com', 'louisvuitton.com'];
  
  links.forEach(link => {
    try {
      const url = new URL(link);
      if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url.hostname)) score += 5; // IP Address
      if (url.hostname.includes('bit.ly') || url.hostname.includes('tinyurl')) score += 3; // Shortener
      const isSafe = safe.some(d => url.hostname.endsWith(d));
      if (!isSafe) score += 2; // Unknown domain
    } catch (e) { score += 1; }
  });
  return Math.min(score, 10);
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "analyze_context" && model) {
    model.embed([req.text]).then(embeddings => {
      const vec = embeddings.squeeze();
      const loginScore = calculateSimilarity(anchorTensors.login, vec);
      const moneyScore = calculateSimilarity(anchorTensors.money, vec);
      const intentScore = Math.max(loginScore, moneyScore);
      const linkScore = analyzeLinks(req.links);

      let isThreat = false;
      let finalScore = 0;
      let verdict = "Safe";

      // --- THE 3-WAY DECISION ---
      
      // 1. Text is OBVIOUSLY bad (e.g. "Log in via Facebook")
      if (intentScore > 0.60) {
        isThreat = true;
        finalScore = intentScore * 10;
        verdict = "High-Risk Language (Scam Intent)";
      }
      // 2. Link is OBVIOUSLY bad (e.g. IP address)
      else if (linkScore >= 4) {
        isThreat = true;
        finalScore = 8.5;
        verdict = "Dangerous Link Detected";
      }
      // 3. Smart Combo (Text is weird + Link is weird)
      else if (intentScore > 0.45 && linkScore >= 2) {
        isThreat = true;
        finalScore = (intentScore * 10) + linkScore;
        verdict = "Suspicious Request + Unverified Link";
      }

      sendResponse({ isThreat, score: finalScore.toFixed(1), verdict });
      vec.dispose(); embeddings.dispose();
    });
    return true;
  }
});

setInterval(() => { chrome.runtime.getPlatformInfo(() => {}); }, 20000);
