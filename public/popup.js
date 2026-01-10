document.addEventListener('DOMContentLoaded', () => {
  // Read the data saved by content.js
  chrome.storage.local.get(['latestVerdict'], (result) => {
    const data = result.latestVerdict;
    const container = document.getElementById('result-area');

    if (!data) {
      container.innerHTML = `<span class="status-icon" style="color:#ccc">💤</span><p>No active scan.</p>`;
      return;
    }

    if (data.isThreat) {
      // THREAT STATE
      container.innerHTML = `
        <span class="status-icon danger">🛡️</span>
        <div style="color: #c0392b; font-weight: bold; margin-bottom:5px;">THREAT DETECTED</div>
        <div class="score-box" style="background: #fadbd8; color: #c0392b;">
          Risk Score: ${data.score}/10
        </div>
        <div class="details">
          <strong>Subject:</strong> ${data.subject}<br>
          <strong>Time:</strong> ${data.timestamp}
        </div>
      `;
    } else {
      // SAFE STATE
      container.innerHTML = `
        <span class="status-icon safe">✅</span>
        <div style="color: #27ae60; font-weight: bold; margin-bottom:5px;">EMAIL VERIFIED</div>
        <div class="score-box" style="background: #d5f5e3; color: #27ae60;">
          Risk Score: ${data.score}/10
        </div>
        <div class="details">
          <strong>Subject:</strong> ${data.subject}<br>
          <strong>Time:</strong> ${data.timestamp}
        </div>
      `;
    }
  });
});
