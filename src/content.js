// src/content.js
console.log("🛡️ Clarity AI: MAX SECURITY ENGINE (Aggressive Mode)");

// --- 1. KILL SWITCH (Social Block) ---
const BLOCKED_DOMAINS = [
  "linkedin.com", "github.com", "facebook.com", "twitter.com", 
  "x.com", "instagram.com", "tiktok.com", "youtube.com", "stackoverflow.com"
];
if (BLOCKED_DOMAINS.some(d => window.location.hostname.includes(d))) {
  throw new Error("Clarity AI stopped: Domain Blocked.");
}

// --- 2. URL FILTER ---
const ALLOWED_KEYWORDS = ["mail", "webmail", "email", "inbox", "outlook", "zimbra", "office"];
const isKnownProvider = ["google.com", "outlook", "yahoo", "office.com", "office365.com"].some(d => window.location.hostname.includes(d));
const isGenericWebmail = ALLOWED_KEYWORDS.some(k => window.location.href.includes(k));

if (!isKnownProvider && !isGenericWebmail) {
  throw new Error("Clarity AI stopped: Non-Email URL.");
}

console.log("🚀 Clarity X-Ray: ACTIVE");

// --- 3. AGGRESSIVE TRIGGER WORDS (Restored) ---
// We put back the broader terms like "login" and "password" to ensure nothing slips through.
const TRIGGER_WORDS = [
  /urgent/gi, /immediate/gi, /action required/gi, /suspended/gi, /deactivated/gi, 
  /verify/gi, /confirm/gi, /password/gi, /login/gi, /sign[- ]?in/gi, 
  /invoice/gi, /payment/gi, /wire transfer/gi, /bank/gi, /security alert/gi,
  /update your/gi, /unusual activity/gi, /credential/gi, /tax return/gi
];

const verifiedSignatures = new Set();
const flaggedSignatures = new Set(); 

// --- 4. HEADER HUNTER (With Outlook Fix) ---
function findEmailContext() {
  
  // A. GMAIL
  const gmailSender = document.querySelector('.gD');
  if (gmailSender) {
    return {
      sender: `${gmailSender.innerText} <${gmailSender.getAttribute("email") || ""}>`,
      subject: document.querySelector('h2.hP')?.innerText || "No Subject",
      bodyContainer: document.querySelector('.a3s.aiL') || document.querySelector('.a3s'),
      platform: "Gmail"
    };
  }

  // B. OUTLOOK / OFFICE 365 (Improved Selector)
  // We check tooltips and multiple container types to find the hidden '@'
  const outlookContainer = document.querySelector('.ReadingPaneRoot') || 
                           document.querySelector('[aria-label="Message body"]')?.closest('[role="main"]') ||
                           document.querySelector('.x_HO'); // Older OWA class

  if (outlookContainer || document.querySelector('div[id*="O365"]')) {
    const senderCandidates = document.querySelectorAll(
      '[data-test-id="persona-details"] span, .O3L68, span[title*="@"], .Un15K'
    );

    for (let el of senderCandidates) {
      const text = el.innerText;
      const title = el.getAttribute("title") || "";
      
      // If we find an @ in the text OR the tooltip, we lock on.
      if (text.includes("@") || title.includes("@")) {
        return {
          sender: text.includes("@") ? text : title,
          subject: document.querySelector('[data-test-id="full-view-subject"]')?.innerText || 
                   document.querySelector('.conv-title')?.innerText || "Subject",
          // Fallback Strategy for Body: Try specific aria-label, then class, then just the container
          bodyContainer: document.querySelector('[aria-label="Message body"]') || 
                         document.querySelector('.ReadingPaneRoot') ||
                         outlookContainer, 
          platform: "Outlook"
        };
      }
    }
  }

  // C. GENERIC WEBMAIL (Universal)
  const potentialSenders = document.querySelectorAll('.sender, .from, .email-header, [class*="sender"]');
  for (let el of potentialSenders) {
    if (el.innerText.includes("@")) {
      const likelyBody = document.querySelector('.message-body, .msg-body, .body, #message-content');
      if (likelyBody) return { sender: el.innerText, subject: document.title, bodyContainer: likelyBody, platform: "Webmail" };
    }
  }
  return null;
}

// --- 5. SCANNER LOOP ---
function scanEmail() {
  const data = findEmailContext();
  if (!data || !data.bodyContainer) return;

  const { sender, subject, bodyContainer, platform } = data;
  
  // Prevent scanning the entire window by accident
  if (bodyContainer === document.body) return;

  const bodyText = bodyContainer.innerText;
  const signature = `${subject}_${bodyText.length}`;

  // 1. CHECK HISTORY
  if (verifiedSignatures.has(signature)) {
    if (bodyContainer.style.filter !== "none") bodyContainer.style.filter = "none";
    return;
  }

  if (flaggedSignatures.has(signature)) {
    if (!bodyContainer.classList.contains('clarity-locked')) {
      applyBlur(bodyContainer);
      if (!document.getElementById('cl-alert')) showWarning(bodyContainer, 8, "Threat Detected (Persisted)", signature);
    }
    return;
  }

  if (bodyContainer.classList.contains('clarity-scanning')) return;

  // 2. START SCAN
  bodyContainer.classList.add('clarity-scanning');
  showBadge(platform);

  // STRICT Structural Check
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

    // STRICT SCORING: If AI says "Threat" (even low score) OR Structure is bad -> FLAG IT.
    const isRisk = (res && res.isThreat) || structRisk.isThreat;
    const verdict = structRisk.isThreat ? structRisk.reason : (res ? res.verdict : "");
    const score = res ? res.score : (structRisk.isThreat ? 9 : 0);

    if (isRisk) {
      flaggedSignatures.add(signature);
      applyBlur(bodyContainer);
      showWarning(bodyContainer, score, verdict, signature);
      highlightTriggers(bodyContainer);
    } else {
      verifiedSignatures.add(signature); 
    }
  });
}

// --- HELPERS ---

// Reverted to STRICT Rule:
// Flags if text is less than 50 chars AND has more than 1 link/image.
function checkStructuralRisk(container, text) {
  const links = container.querySelectorAll('a').length;
  const images = container.querySelectorAll('img').length;
  const len = text.trim().length;

  if (len < 50 && (links > 1 || images > 1)) {
    return { isThreat: true, reason: "Suspicious: Low text content with links/images." };
  }
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
  el.classList.add('clarity-locked'); 
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
          container.querySelectorAll('*').forEach(x => { x.style.filter = ""; x.style.pointerEvents = ""; });
          container.classList.remove('clarity-locked');
          div.remove();
          flaggedSignatures.delete(signature);
          verifiedSignatures.add(signature);
        };
      }
    }
  }, 1000);
}

setInterval(scanEmail, 1500);
