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
  
  // STOP if: No email found, OR already checked, OR already verified (unlocked)
  if (!container || 
      container.classList.contains('clarity-checked') || 
      container.classList.contains('clarity-verified')) {
    return;
  }

  const text = container.innerText;
  if (text.length < 50) return;

  console.log(`👁️ Scanning... Length: ${text.length}`);
  
  chrome.runtime.sendMessage({ action: "analyze_text", text: text }, (response) => {
    container.classList.add('clarity-checked'); // Mark as scanned

    if (chrome.runtime.lastError) return;

    if (response && response.isThreat) {
      console.log("🚨 PHISHING DETECTED! BLURRING.");
      applyBlur(container);
      showWarning(container, response.score); // Pass container so we can unlock it later
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

// --- UI OVERLAY ---
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

    <button id="clarity-unlock-btn" style="
      width: 100%; padding: 12px; border: none; border-radius: 6px;
      background: #2c3e50; color: white; font-weight: bold; cursor: pointer;
      transition: background 0.2s;
    ">
      I have Verified (Unlock Links)
    </button>
  `;

  document.body.appendChild(alert);

  // --- UNLOCK BUTTON LOGIC ---
  document.getElementById('clarity-unlock-btn').onclick = () => {
    unblur(container);
    
    // Mark as "Verified" so the scanner doesn't attack it again
    container.classList.add('clarity-verified'); 
    
    // Remove the alert
    alert.remove();
  };
}

setInterval(scanEmail, 1500);
