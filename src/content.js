console.log("🚀 Clarity X-Ray: LOADED");

// --- 1. MEMORY: Prevent Re-Flagging ---
// We use this Set to remember the "signatures" of emails you have already verified.
// Even if Gmail refreshes the DOM, we will remember "I've seen this text before."
const verifiedSignatures = new Set();

// --- 2. CONFIGURATION: TRIGGER WORDS ---
const TRIGGER_WORDS = [
  /verify your account/gi, /verify your identity/gi, /update your payment/gi,
  /log in/gi, /login/gi, /sign in/gi, /bank account/gi, /wire transfer/gi,
  /suspended/gi, /deactivated/gi, /urgent/gi, /immediate action/gi,
  /click here/gi, /social media/gi, /facebook/gi, /password/gi,
  /credential/gi, /security alert/gi, /unauthorized/gi
];

// --- 3. SELECTOR STRATEGY ---
function getEmailData() {
  let container = null;
  let subject = "No Subject";
  let body = "";

  // GMAIL
  const gmailBody = document.querySelector('.a3s.aiL') || document.querySelector('.a3s'); 
  const gmailSubject = document.querySelector('h2.hP');

  // OUTLOOK
  const outlookBody = document.querySelector('[aria-label="Message body"]');
  const outlookSubject = document.querySelector('.conv-title');

  // GENERIC
  const genericBody = document.querySelector('.message-body, .msg-body, article');

  if (gmailBody) {
    container = gmailBody;
    if (gmailSubject) subject = gmailSubject.innerText;
    body = container.innerText;
  } else if (outlookBody) {
    container = outlookBody;
    if (outlookSubject) subject = outlookSubject.innerText;
    body = container.innerText;
  } else if (genericBody) {
    container = genericBody;
    body = container.innerText;
  } else {
    return null;
  }

  return { container, subject, body };
}

// --- 4. THE SCANNER ---
function scan() {
  const data = getEmailData();
  if (!data) return;

  const { container, subject, body } = data;

  // GENERATE SIGNATURE: A unique ID for this specific email content
  // We use Subject + Length of body to create a simple unique key
  const signature = `${subject}_${body.length}`;

  // CHECK 1: Have we already marked this specific element?
  if (container.classList.contains('clarity-checked') || 
      container.classList.contains('clarity-scanning')) return;

  // CHECK 2: Have we explicitly verified this content before? (The Fix)
  if (verifiedSignatures.has(signature)) {
    // Ideally, ensure it's unblurred if it was re-rendered
    container.style.filter = "none";
    return;
  }

  // START SCAN
  container.classList.add('clarity-scanning');
  showBadge();
  console.log(`👁️ X-RAY SCAN: ${subject}`);

  const fullText = `Subject: ${subject}\n\n${body}`;
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
      console.log(`🚨 THREAT DETECTED: Executing X-Ray Highlights...`);
      
      // A. Lock the Links
      applyBlur(container);
      
      // B. Show the Warning (Pass the signature so we can whitelist it)
      showWarning(container, res.score, res.verdict, signature);
      
      // C. Highlight Triggers
      highlightTriggers(container);
    }
  });
}

// --- 5. THE X-RAY HIGHLIGHTER ---
function highlightTriggers(rootElement) {
  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null, false);
  let node;
  const nodesToReplace = [];

  while (node = walker.nextNode()) {
    const text = node.nodeValue;
    if (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE') continue;

    const hasTrigger = TRIGGER_WORDS.some(regex => regex.test(text));
    if (hasTrigger) {
      nodesToReplace.push(node);
    }
  }

  nodesToReplace.forEach(textNode => {
    const span = document.createElement('span');
    span.innerHTML = textNode.nodeValue;
    
    TRIGGER_WORDS.forEach(regex => {
      span.innerHTML = span.innerHTML.replace(regex, (match) => {
        return `<span style="background-color: #fadbd8; border-bottom: 2px solid #c0392b; color: #c0392b; font-weight: bold; padding: 0 2px; border-radius: 2px;">${match}</span>`;
      });
    });

    if (textNode.parentNode) {
      textNode.parentNode.replaceChild(span, textNode);
    }
  });
}

// --- 6. UI HELPERS ---

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

// UPDATED: Now accepts 'signature' to save verification
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
    <h3 style="margin:0 0 10px 0; color:#c0392b; font-size:16px;">⚠️ Threat Detected</h3>
    <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:4px; margin-bottom:12px; font-size:13px; line-height:1.4;">
      <strong>Why:</strong> ${verdict}
      <br><br>
      <em style="color:#555">We highlighted suspicious terms in the email for you.</em>
    </div>
    <div style="font-size:12px; margin-bottom:15px; color:#555;">
      <strong>Risk Score:</strong> ${score}/10
    </div>
    <button id="unl-btn" disabled style="width:100%; padding:10px; background:#ccc; border:none; border-radius:4px; color:white; font-weight:bold; cursor:not-allowed;">Wait 5s...</button>
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
        btn.disabled = false; 
        btn.innerText = "Unlock Links"; 
        btn.style.background = "#2c3e50"; 
        btn.style.cursor = "pointer";
        btn.onclick = () => {
          // 1. Unblock elements
          container.querySelectorAll('*').forEach(x => { x.style.filter = ""; x.style.pointerEvents = ""; });
          
          // 2. Remove Alert
          alert.remove();

          // 3. THE FIX: Add this email's signature to the Verified List
          // This ensures that even if the DOM refreshes, we won't flag this text again.
          verifiedSignatures.add(signature);
          console.log(`✅ Email verified by user. Signature added to safelist.`);
        };
      }
    }
  }, 1000);
}

// SCAN LOOP
setInterval(scan, 1500);
