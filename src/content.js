// src/content.js
console.log("🛡️ Clarity AI: Pro Engine (Tuned for False Positives)");

// --- 1. KILL SWITCH (Social Block) ---
const BLOCKED_DOMAINS = [
  "linkedin.com", "github.com", "facebook.com", "twitter.com", 
  "x.com", "instagram.com", "tiktok.com", "youtube.com", "stackoverflow.com"
];
if (BLOCKED_DOMAINS.some(d => window.location.hostname.includes(d))) {
  throw new Error("Clarity AI stopped: Domain Blocked.");
}

// --- 2. URL FILTER (Must look like email) ---
const ALLOWED_KEYWORDS = ["mail", "webmail", "email", "inbox", "outlook", "zimbra"];
const isKnownProvider = ["google.com", "outlook", "yahoo", "office.com", "office365.com"].some(d => window.location.hostname.includes(d));
const isGenericWebmail = ALLOWED_KEYWORDS.some(k => window.location.href.includes(k));

if (!isKnownProvider && !isGenericWebmail) {
  throw new Error("Clarity AI stopped: Non-Email URL.");
}

console.log("🚀 Clarity X-Ray: ACTIVE");

// --- 3. TUNED TRIGGERS (Less Sensitive) ---
// I removed generic words like "payment" or "login" alone. 
// Now it focuses on HIGH RISK phrases.
const TRIGGER_WORDS = [
  /urgent action/gi, /immediate action/gi, /account suspended/gi, /account deactivated/gi, 
  /verify your identity/gi, /confirm your password/gi, /unusual sign-in/gi, 
  /wire transfer/gi, /security alert/gi, /final notice/gi
];

const verifiedSignatures = new Set();
const flaggedSignatures = new Set(); 

// --- 4. HEADER HUNTER (Outlook Fix) ---
function findEmailContext() {
  
  // A. GMAIL (Standard)
  const gmailSender = document.querySelector('.gD');
  if (gmailSender) {
    return {
      sender: `${gmailSender.innerText} <${gmailSender.getAttribute("email") || ""}>`,
      subject: document.querySelector('h2.hP')?.innerText || "No Subject",
      bodyContainer: document.querySelector('.a3s.aiL') || document.querySelector('.a3s'),
      platform: "Gmail"
    };
  }

  // B. OUTLOOK / OFFICE 365 (The Fix)
  // Outlook hides emails in 'title' attributes or specific Aria labels. 
  // We search for ANY element in the header that has an '@' in its title.
  const outlookContainer = document.querySelector('.ReadingPaneRoot') || 
                           document.querySelector('[aria-label="Message body"]')?.closest('[role="main"]');

  if (outlookContainer || document.querySelector('div[id*="O365"]')) {
    // Look for the sender in the header area
    const senderCandidates = document.querySelectorAll(
      '[data-test-id="persona-details"] span, .O3L68, span[title*="@"]'
    );

    for (let el of senderCandidates) {
      // Check Visible Text OR Tooltip Text
      const text = el.innerText;
      const title = el.getAttribute("title") || "";
      
      if (text.includes("@") || title.includes("@")) {
        // We found the sender!
        return {
          sender: text.includes("@") ? text : title, // Prefer the one with the @
          subject: document.querySelector('[data-test-id="full-view-subject"]')?.innerText || 
                   document.querySelector('.conv-title')?.innerText || "Subject",
          // Try to grab the specific reading pane body
          bodyContainer: document.querySelector('[aria-label="Message body"]') || 
                         document.querySelector('.ReadingPaneRoot') ||
                         document.body, // Fallback (careful with this)
          platform: "Outlook"
        };
      }
    }
  }

  // C. GENERIC WEBMAIL (Strict '@' Check)
  // Only runs if we haven't found Gmail or Outlook
  const potentialSenders = document.querySelectorAll('.sender, .from, .email-header');
  for (let el of potentialSenders) {
    if (el.innerText.includes("@")) {
      const likelyBody = document.querySelector('.message-body, .msg-body, .body');
      if (likelyBody) return { sender: el.innerText, subject: document.title, bodyContainer: likelyBody, platform: "Webmail" };
    }
  }
  return null;
}

// --- 5. THE SCANNER LOOP ---
function scanEmail() {
  const data = findEmailContext();
  if (!data || !data.bodyContainer) return;

  const { sender, subject, bodyContainer, platform } = data;
  
  // SAFETY CHECK: Ensure we aren't scanning the whole body of Outlook, just the message
  if (bodyContainer === document.body) return;

  const bodyText = bodyContainer.innerText;
  const signature = `${subject}_${bodyText.length}`;

  if (verifiedSignatures.has(signature)) {
    if (bodyContainer.style.filter !== "none") bodyContainer.style.filter = "none";
    return;
  }

  if (flaggedSignatures.has(signature)) {
    if (!bodyContainer.classList.contains('clarity-locked')) {
      applyBlur(bodyContainer);
      if (!document.getElementById('cl-alert')) showWarning(bodyContainer, 8, "Threat Detected", signature);
    }
    return;
  }

  if (bodyContainer.classList.contains('clarity-scanning')) return;

  // --- START SCAN ---
  bodyContainer.classList.add('clarity-scanning');
  showBadge(platform);

  // 1. Structural Check (RELAXED)
  const structRisk = checkStructuralRisk(bodyContainer, bodyText);
  
  // 2. AI Check
  const fullText = `From: ${sender}\nSubject: ${subject}\n\n${bodyText}`;
  const links = Array.from(bodyContainer.querySelectorAll('a')).map(a => a.href);

  chrome.runtime.sendMessage({ 
    action: "analyze_context", 
    text: fullText, 
    links: links 
  }, (res) => {
    bodyContainer.classList.remove('clarity-scanning');
    hideBadge();

    // LOGIC TWEAK: AI Score must be > 7 OR Structural Risk must be severe
    const aiThreat = res && res.isThreat && res.score > 7; 
    const isRisk = aiThreat || structRisk.isThreat;
    
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

// UPDATED: Much less sensitive. 
// Only flags if text is TINY (<30 chars) AND has an image.
// Normal emails ("Thanks, see you then") will pass now.
function checkStructuralRisk(container, text) {
  const links = container.querySelectorAll('a').length;
  const images = container.querySelectorAll('img').length;
  const cleanText = text.replace(/\s/g, "").length; // Count actual letters, not spaces

  if (cleanText < 30 && images > 0 && links > 0) {
    return { isThreat: true, reason: "Suspicious: Image-only email detected." };
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
  b.innerText = `🛡️ Clarity AI (${platform})`;
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
