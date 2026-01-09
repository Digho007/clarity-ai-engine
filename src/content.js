console.log("👁️ Clarity Eyes: WATCHING...");

function findEmailBody() {
  const gmail = document.querySelector('.a3s');
  if (gmail) return gmail;
  const generic = document.querySelector('[aria-label="Message body"]');
  if (generic) return generic;
  return null;
}

function scanEmail() {
  const container = findEmailBody();
  
  // STOP if: 
  // 1. No email found
  // 2. Already checked
  // 3. Already verified (Unlocked)
  // 4. Currently being scanned (PREVENTS THE RE-BLUR BUG)
  if (!container || 
      container.classList.contains('clarity-checked') || 
      container.classList.contains('clarity-verified') ||
      container.classList.contains('clarity-scanning')) {
    return;
  }

  const text = container.innerText;
  if (text.length < 50) return;

  // 1. MARK AS "IN PROGRESS"
  container.classList.add('clarity-scanning');
  console.log(`👁️ Scanning... Length: ${text.length}`);
  
  chrome.runtime.sendMessage({ action: "analyze_text", text: text }, (response) => {
    // 2. REMOVE "IN PROGRESS" MARKER
    container.classList.remove('clarity-scanning');
    
    // 3. MARK AS CHECKED
    container.classList.add('clarity-checked');

    if (chrome.runtime.lastError) return;

    // 4. CRITICAL SAFETY CHECK
    // If you unlocked the email while the AI was thinking, STOP HERE.
    if (container.classList.contains('clarity-verified')) {
      console.log("🛡️ Email was verified by user. Skipping blur.");
      return; 
    }

    if (response && response.isThreat) {
      console.log("🚨 PHISHING DETECTED! BLURRING.");
      applyBlur(container);
      showWarning(container, response.score);
    }
  });
}

// --- BLUR LOGIC ---
function applyBlur(container) {
  const elements = container.querySelectorAll('a, button');
  elements.forEach(el => {
    el.style.filter = "blur(6px)";
    el.style.pointerEvents = "none";
    el.style.transition = "filter 0.3s";
    el.classList.add('clarity-blurred-item'); // Mark for easy removal
  });
}

function unblur(container) {
  const elements = container.querySelectorAll('.clarity-blurred-item');
  elements.forEach(el => {
    el.style.filter = "none";
    el.style.pointerEvents = "auto";
    el.classList.remove('clarity-blurred-item');
  });
}

// --- UI OVERLAY (With Cognitive Pause Timer) ---
function showWarning(container, score) {
  // Prevent duplicate alerts
  if (document.getElementById('clarity-alert-box')) return;

  const alert = document.createElement('div');
  alert.id = 'clarity-alert-box';
  alert.style.cssText = `
    position: fixed; top: 80px; right: 20px; width: 320px;
    background: white; color: #333; padding: 20px; 
    z-index: 999999; border-radius: 12px; font-family: sans-serif;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3); 
    border-left: 6px solid #e74c3c;
    animation: slideIn 0.3s ease-out;
  `;

  alert.innerHTML = `
    <h3 style="margin:0 0 8px 0; color: #c0392b; font-size: 18px;">⚠️ Phishing Detected</h3>
    <p style="margin:0 0 15px 0; font-size:14px; color: #555; line-height: 1.4;">
      This email uses high-pressure language typical of social engineering.
    </p>
    
    <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; font-size: 12px; color: #666; margin-bottom: 15px;">
      <strong>Risk Score:</strong> <span style="color:#e74c3c; font-weight:bold;">${score}</span> / 10.0
    </div>

    <button id="clarity-unlock-btn" disabled style="
      width: 100%; padding: 12px; border: none; border-radius: 6px;
      background: #bdc3c7; color: white; font-weight: bold; cursor: not-allowed;
      transition: background 0.3s;
    ">
      Wait 5s...
    </button>
  `;

  document.body.appendChild(alert);

  // --- THE COUNTDOWN LOGIC ---
  const btn = document.getElementById('clarity-unlock-btn');
  let timeLeft = 5;

  const timer = setInterval(() => {
    timeLeft--;
    btn.innerText = `Wait ${timeLeft}s...`;
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      // ENABLE THE BUTTON
      btn.disabled = false;
      btn.innerText = "I have Verified (Unlock Links)";
      btn.style.background = "#2c3e50"; // Turn dark blue
      btn.style.cursor = "pointer";
    }
  }, 1000);

  // CLICK HANDLER
  btn.onclick = () => {
    unblur(container);
    
    // Mark as "Verified" so the scanner doesn't attack it again
    container.classList.add('clarity-verified'); 
    
    // Remove the alert
    alert.remove();
  };
}

setInterval(scanEmail, 1500);
