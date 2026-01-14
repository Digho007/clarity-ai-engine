console.log("🚀 Clarity X-Ray: EMAIL MODE ACTIVE (Sender Scanning Enabled)");

// --- 1. CONFIGURATION ---
const TRIGGER_WORDS = [
  /verify your account/gi, /verify your identity/gi, /update your payment/gi,
  /log in/gi, /login/gi, /sign in/gi, /bank account/gi, /wire transfer/gi,
  /suspended/gi, /deactivated/gi, /urgent/gi, /immediate action/gi,
  /click here/gi, /password/gi, /credential/gi, /security alert/gi
];

// Memory to prevent re-scanning the same email while you read it
const verifiedSignatures = new Set();

// --- 2. SELECTOR STRATEGY (Gmail & Outlook) ---
function getEmailData() {
  // GMAIL
  const gmailBody = document.querySelector('.a3s.aiL') || document.querySelector('.a3s'); 
  const gmailSubject = document.querySelector('h2.hP');
  const gmailSender = document.querySelector('.gD'); // Selects the sender name/email wrapper

  // OUTLOOK
  const outlookBody = document.querySelector('[aria-label="Message body"]');
  const outlookSubject = document.querySelector('.conv-title');
  // Outlook is tricky; this targets the sender line, but might need adjustment based on their updates
  const outlookSender = document.querySelector('.O3L68') || document.querySelector('.Un15K'); 

  // GENERIC (Fallbacks)
  const genericBody = document.querySelector('.message-body, article');

  let sender = "Unknown Sender";
  let subject = "No Subject";
  let body = "";
  let container = null;

  if (gmailBody) {
    container = gmailBody;
    if (gmailSubject) subject = gmailSubject.innerText;
    if (gmailSender) {
      // Grab both name and the email attribute: "John Doe <john@example.com>"
      sender = `${gmailSender.innerText} <${gmailSender.getAttribute("email") || "hidden"}>`;
    }
    body = gmailBody.innerText;
  } else if (outlookBody) {
    container = outlookBody;
    if (outlookSubject) subject = outlookSubject.innerText;
    if (outlookSender) sender = outlookSender.innerText;
    body = outlookBody.innerText;
  } else if (genericBody) {
    container = genericBody;
    body = genericBody.innerText;
  } else {
    return null;
  }

  return { container, sender, subject, body };
}

// --- 3. THE SCANNER ---
function scanEmail() {
  const data = getEmailData();
  if (!data) return; // No email open right now

  const { container, sender, subject, body } = data;
  
  // Create a unique ID for this email content
  const signature = `${subject}_${body.length}`;

  // A. Skip if already processed in DOM
  if (container.classList.contains('clarity-checked') || 
      container.classList.contains('clarity-scanning')) return;

  // B. Skip if user already verified this specific email
  if (verifiedSignatures.has(signature)) {
    container.style.filter = "none";
    return;
  }

  // C. Start Analysis
  container.classList.add('clarity-scanning');
  showBadge();
  console.log(`👁️ Scanning: ${subject} (From: ${sender})`);

  // NEW: Include Sender in the text analysis so AI can detect spoofing
  const fullText = `From: ${sender}\nSubject: ${subject}\n\n${body}`;
  const links = Array.from(container.querySelectorAll('a')).map(a => a.href);

  chrome.runtime.sendMessage({ 
    action: "analyze_context", 
    text: fullText, 
    links: links 
  }, (res) => {
    container.classList.remove('clarity-scanning');
    container.classList.add('clarity-checked');
    hideBadge();

    if (res && res.isThreat) {
      console.log(`🚨 THREAT DETECTED: ${res.verdict}`);
      
      // 1. The Cognitive Pause (Blur Links)
      applyBlur(container);
      
      // 2. The Warning Modal
      showWarning(container, res.score, res.verdict, signature);
      
      // 3. Highlight Trigger Words
      highlightTriggers(container);
    }
  });
}

// --- 4. UI HELPERS ---

function highlightTriggers(rootElement) {
  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null, false);
  let node;
  const nodesToReplace = [];

  while (node = walker.nextNode()) {
    const text = node.nodeValue;
    if (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE') continue;
    if (TRIGGER_WORDS.some(regex => regex.test(text))) nodesToReplace.push(node);
  }

  nodesToReplace.forEach(textNode => {
    const span = document.createElement('span');
    span.innerHTML = textNode.nodeValue;
    TRIGGER_WORDS.forEach(regex => {
      span.innerHTML = span.innerHTML.replace(regex, (match) => {
        return `<span style="background-color: #fadbd8; border-bottom: 2px solid #c0392b; color: #c0392b; font-weight: bold;">${match}</span>`;
      });
    });
    if (textNode.parentNode) textNode.parentNode.replaceChild(span, textNode);
  });
}

function showBadge() {
  if (document.getElementById('cl-badge')) return;
  const b = document.createElement('div');
  b.id = 'cl-badge';
  b.innerText = "🛡️ AI Scanning...";
  b.style.cssText = "position:fixed; bottom:20px; right:20px; background:#f1c40f; color:#333; padding:8px 12px; border-radius:20px; font-weight:bold; z-index:9999; font-family:sans-serif; font-size:12px; box-shadow:0 2px 5px rgba(0,0,0,0.2);";
  document.body.appendChild(b);
}

function hideBadge() { document.getElementById('cl-badge')?.remove(); }

function applyBlur(el) {
  el.querySelectorAll('a, button, input').forEach(i => {
    i.style.filter = "blur(5px)";
    i.style.pointerEvents = "none";
  });
}

function showWarning(container, score, verdict, signature) {
  if (document.getElementById('cl-alert')) return;
  const alert = document.createElement('div');
  alert.id = 'cl-alert';
  alert.style.cssText = `
    position: fixed; top: 100px; right: 20px; width: 320px;
    background: white; padding: 20px; border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.4); border-left: 6px solid #c0392b;
    z-index: 2147483647; font-family: sans-serif; animation: slideIn 0.3s;
  `;
  alert.innerHTML = `
    <h3 style="margin:0 0 10px 0; color:#c0392b;">⚠️ Threat Detected</h3>
    <p style="font-size:13px; color:#555;">${verdict}</p>
    <div style="font-size:12px; margin-bottom:10px; color:#777;">Risk Score: ${score}/10</div>
    <button id="unl-btn" disabled style="width:100%; padding:10px; background:#ccc; border:none; border-radius:4px; color:white; font-weight:bold;">Wait 5s...</button>
  `;
  document.body.appendChild(alert);

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
          alert.remove();
          verifiedSignatures.add(signature);
        };
      }
    }
  }, 1000);
}

// Run scanner loop every 1.5 seconds
setInterval(scanEmail, 1500);
