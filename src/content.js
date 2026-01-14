// src/content.js
console.log("🛡️ Clarity AI: Engine Loaded (Persistent Mode)");

// --- 1. KILL SWITCH ---
const BLOCKED_DOMAINS = [
  "linkedin.com", "github.com", "facebook.com", "twitter.com", 
  "x.com", "instagram.com", "tiktok.com", "youtube.com", "stackoverflow.com"
];
if (BLOCKED_DOMAINS.some(d => window.location.hostname.includes(d))) {
  throw new Error("Clarity AI stopped: Domain Blocked.");
}

// --- 2. URL FILTER ---
const ALLOWED_KEYWORDS = ["mail", "webmail", "email", "inbox", "outlook", "zimbra"];
const isKnownProvider = ["google.com", "outlook", "yahoo"].some(d => window.location.hostname.includes(d));
const isGenericWebmail = ALLOWED_KEYWORDS.some(k => window.location.href.includes(k));

if (!isKnownProvider && !isGenericWebmail) {
  throw new Error("Clarity AI stopped: Non-Email URL.");
}

console.log("🚀 Clarity X-Ray: ACTIVE");

// --- 3. MEMORY SYSTEM (The Fix) ---
const TRIGGER_WORDS = [
  /urgent/gi, /immediate/gi, /action required/gi, /suspended/gi, /deactivated/gi, 
  /verify/gi, /confirm/gi, /password/gi, /login/gi, /sign[- ]?in/gi, 
  /invoice/gi, /payment/gi, /wire transfer/gi, /bank/gi, /security alert/gi
];

// verified = User clicked "Unlock" (Safe)
const verifiedSignatures = new Set();
// flagged = AI marked as threat (Danger)
const flaggedSignatures = new Set(); 

// --- 4. HEADER HUNTER ---
function findEmailContext() {
  // A. Gmail
  const gmailSender = document.querySelector('.gD');
  if (gmailSender) {
    return {
      sender: `${gmailSender.innerText} <${gmailSender.getAttribute("email") || ""}>`,
      subject: document.querySelector('h2.hP')?.innerText || "No Subject",
      bodyContainer: document.querySelector('.a3s.aiL') || document.querySelector('.a3s'),
      platform: "Gmail"
    };
  }
  // B. Outlook
  const outlookSender = document.querySelector('.O3L68') || document.querySelector('[data-test-id="persona-container"]');
  if (outlookSender) {
    const rawText = outlookSender.innerText + " " + (outlookSender.getAttribute("title") || "");
    if (rawText.includes("@")) {
      return {
        sender: rawText.replace(/\n/g, " ").trim(),
        subject: document.querySelector('[data-test-id="full-view-subject"]')?.innerText || "No Subject",
        bodyContainer: document.querySelector('[aria-label="Message body"]') || document.querySelector('.ReadingPaneRoot'),
        platform: "Outlook"
      };
    }
  }
  // C. Generic Webmail (Strict)
  const potentialSenders = document.querySelectorAll('.sender, .from, .email-header, [class*="sender"]');
  for (let el of potentialSenders) {
    if (el.innerText.includes("@")) {
      const likelyBody = document.querySelector('.message-body, .msg-body, .body, #message-content');
      if (likelyBody) return { sender: el.innerText, subject: document.title, bodyContainer: likelyBody, platform: "Webmail" };
    }
  }
  return null;
}

// --- 5. INTELLIGENT SCANNER ---
function scanEmail() {
  const data = findEmailContext();
  if (!data || !data.bodyContainer) return;

  const { sender, subject, bodyContainer, platform } = data;
  const bodyText = bodyContainer.innerText;
  const signature = `${subject}_${bodyText.length}`;

  // CHECK 1: Is it already VERIFIED by the user? (Allow Access)
  if (verifiedSignatures.has(signature)) {
    // If provider refreshed the DOM and removed our "unblur", put it back.
    if (bodyContainer.style.filter !== "none") bodyContainer.style.filter = "none";
    return;
  }

  // CHECK 2: Is it ALREADY KNOWN as a threat? (Persist Lock)
  // This prevents re-running the AI on every refresh.
  if (flaggedSignatures.has(signature)) {
    // Re-apply visual lock if the website wiped it
    if (!bodyContainer.classList.contains('clarity-locked')) {
      console.log("🔒 Re-locking refreshed malicious email...");
      applyBlur(bodyContainer);
      // Only show warning if not currently visible
      if (!document.getElementById('cl-alert')) {
        showWarning(bodyContainer, 8, "Threat Detected (Persisted)", signature);
      }
    }
    return;
  }

  // CHECK 3: Is it currently being scanned?
  if (bodyContainer.classList.contains('clarity-scanning')) return;

  // --- NEW SCAN START ---
  bodyContainer.classList.add('clarity-scanning');
  showBadge(platform);

  const structRisk = checkStructuralRisk(bodyContainer, bodyText);
  const fullText = `From: ${sender}\nSubject: ${subject}\n\n${bodyText}`;
  const links = Array.from(bodyContainer.querySelectorAll('a')).map(a => a.href);

  chrome.runtime.sendMessage({ 
    action: "analyze_context", 
    text: fullText, 
    links: links 
  }, (res) => {
    bodyContainer.classList.remove('clarity-scanning');
    hideBadge();

    const isRisk = (res && res.isThreat) || structRisk.isThreat;
    const verdict = structRisk.isThreat ? structRisk.reason : (res ? res.verdict : "");
    const score = res ? res.score : (structRisk.isThreat ? 9 : 0);

    if (isRisk) {
      // SAVE TO MEMORY SO WE DON'T SCAN AGAIN
      flaggedSignatures.add(signature);
      
      applyBlur(bodyContainer);
      showWarning(bodyContainer, score, verdict, signature);
      highlightTriggers(bodyContainer);
    } else {
      // Mark as safe so we don't scan again
      verifiedSignatures.add(signature); 
    }
  });
}

// --- HELPERS ---
function checkStructuralRisk(container, text) {
  const links = container.querySelectorAll('a').length;
  const images = container.querySelectorAll('img').length;
  const len = text.trim().length;
  if (len < 50 && (links > 1 || images > 1)) return { isThreat: true, reason: "Suspicious: High Image/Link ratio" };
  return { isThreat: false };
}

function highlightTriggers(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  let node; const nodes = [];
  while (node = walker.nextNode()) {
    if (['SCRIPT','STYLE'].includes(node.parentNode.tagName)) continue;
    if (TRIGGER_WORDS.some(r => r.test(node.nodeValue))) nodes.push(node);
  }
  nodes.forEach(n => {
    const s = document.createElement('span'); s.innerHTML = n.nodeValue;
    TRIGGER_WORDS.forEach(r => {
      s.innerHTML = s.innerHTML.replace(r, m => `<span style="background:#fadbd8; border-bottom:2px solid #c0392b; color:#c0392b; font-weight:bold;">${m}</span>`);
    });
    n.parentNode.replaceChild(s, n);
  });
}

function showBadge(platform) {
  if (document.getElementById('cl-badge')) return;
  const b = document.createElement('div');
  b.id = 'cl-badge';
  b.innerText = `🛡️ Scanning (${platform})...`;
  b.style.cssText = "position:fixed; bottom:20px; right:20px; background:#f1c40f; color:#333; padding:8px 12px; border-radius:20px; font-weight:bold; z-index:99999; font-family:sans-serif; font-size:12px; box-shadow:0 2px 5px rgba(0,0,0,0.2);";
  document.body.appendChild(b);
}

function hideBadge() { document.getElementById('cl-badge')?.remove(); }

function applyBlur(el) {
  el.classList.add('clarity-locked'); // Marker for our logic
  el.querySelectorAll('a, button, input').forEach(i => { i.style.filter = "blur(5px)"; i.style.pointerEvents = "none"; });
}

function showWarning(container, score, verdict, signature) {
  if (document.getElementById('cl-alert')) return;
  const div = document.createElement('div');
  div.id = 'cl-alert';
  div.style.cssText = "position:fixed; top:100px; right:20px; width:320px; background:white; padding:20px; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.4); border-left:6px solid #c0392b; z-index:2147483647; font-family:sans-serif;";
  div.innerHTML = `
    <h3 style="margin:0 0 10px 0; color:#c0392b;">⚠️ Threat Detected</h3>
    <p style="font-size:13px; color:#555;">${verdict}</p>
    <div style="font-size:12px; margin-bottom:10px; color:#777;">Risk Score: ${score}/10</div>
    <button id="unl-btn" disabled style="width:100%; padding:10px; background:#ccc; border:none; border-radius:4px; color:white; font-weight:bold;">Wait 5s...</button>
  `;
  document.body.appendChild(div);

  let t = 5;
  const i = setInterval(() => {
    t--;
    const btn = document.getElementById('unl-btn');
    if(btn) btn.innerText = `Wait ${t}s...`;
    if (t <= 0) {
      clearInterval(i);
      if(btn) {
        btn.disabled = false; btn.innerText = "Unlock Links"; btn.style.background = "#2c3e50"; btn.style.cursor = "pointer";
        btn.onclick = () => {
          // 1. UNLOCK VISUALS
          container.querySelectorAll('*').forEach(x => { x.style.filter = ""; x.style.pointerEvents = ""; });
          container.classList.remove('clarity-locked');
          div.remove();
          
          // 2. UPDATE MEMORY (Swap from Flagged -> Verified)
          flaggedSignatures.delete(signature);
          verifiedSignatures.add(signature);
        };
      }
    }
  }, 1000);
}

setInterval(scanEmail, 1500);
