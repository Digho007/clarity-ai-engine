# Clarity AI: The "Glass-Box" Phishing Detector

**Clarity AI** is a next-generation browser extension that uses local, client-side Artificial Intelligence to detect, explain, and block sophisticated phishing attacks in real-time.

Unlike traditional "Black Box" security tools that simply block a page, Clarity uses **X-Ray Vision** to highlight exactly why an email is dangerous, training the user to recognize psychological triggers and social engineering tactics.

---

## 🚀 Key Features

- **👁️ X-Ray Vision (Explainable AI):** Instead of a generic warning, Clarity highlights specific trigger words (e.g., "wire transfer," "log in via Facebook") directly in the email body, teaching users to spot scams.

- **🧠 Hybrid Brain Architecture:** Combines Semantic Intent Analysis (TensorFlow.js) with Heuristic Checks (Link Reputation) to catch "polite" phishing attacks that bypass standard spam filters.

- **🔒 Privacy-First (Edge AI):** All analysis happens locally in your browser memory. Your private emails never leave your device and are never sent to a cloud server.

- **🛡️ Zero-Click Defense:** Automatically blurs dangerous links and input fields the moment a threat is detected, preventing accidental clicks.

- **🎯 Targeted Scanning:** Intelligently identifies email containers (Gmail, Outlook, Webmail) to scan only the relevant message content, ignoring sidebars and ads.

---

## 🛠️ Installation & Setup

### Prerequisites

- Node.js and npm installed.
- Google Chrome (or Chromium-based browser).

### 1. Clone & Install

```bash
git clone https://github.com/Digho007/clarity-ai.git
cd clarity-ai
npm install
```

### 2. Build the Extension

This compiles the TensorFlow models and bundles the scripts.

```bash
npm run build:all
```

### 3. Browser Loading

#### For Google Chrome / Brave / Edge:
1. Open your browser and type `chrome://extensions` in the address bar.
2. Turn on **Developer mode** (top right switch).
3. Click **Load unpacked.**
4. Select the `dist-chrome` folder from your project directory.

#### For Firefox:
1. Type `about:debugging` in the address bar.
2. Click **This Firefox** (left sidebar).
3. Click **Load Temporary Add-on...**
4. Navigate to the `dist-firefox` folder and select the `manifest.json` file.

---

## 🖥️ Usage

1. **Open an Email:** Navigate to Gmail, Outlook, or your preferred webmail provider.
2. **Automatic Scan:** Clarity automatically scans the Subject and Body of the open email.

### Status Indicators:
- **Safe:** The extension remains silent.
- **Threat Detected:**
  - A **Red Warning Box** appears explaining the verdict.
  - Links and buttons are **Blurred/Locked**.
  - Suspicious keywords are **Highlighted in Red** (X-Ray Vision).

3. **Popup Dashboard:** Click the extension icon in the toolbar to see the current risk score and analysis details.

---

## 🏗️ Technical Architecture

Clarity operates on a **Manifest V3 architecture**:

### **The Eyes (content.js):**
- Uses strict DOM selectors to find email bodies.
- Extracts text and links.
- Injects visual alerts and performs the X-Ray text highlighting.

### **The Brain (background.js):**
- Loads the **Universal Sentence Encoder (USE)** model via TensorFlow.js.
- Calculates a **"Semantic Similarity Score"** against known threat anchors (e.g., financial urgency, credential theft).
- Performs heuristic analysis on link domains (IP checks, shorteners).
- Returns a weighted risk score to the content script.

---

## 📊 The "Hybrid" Logic

Clarity uses a **3-Way Defense Matrix** to determine threats:

1. **Text Override:** If semantic intent > 0.60 (e.g., "Wire money now"), it blocks regardless of links.
2. **Link Override:** If a link is toxic (e.g., raw IP address), it blocks regardless of text.
3. **Smart Match:** If text is suspicious (> 0.45) AND links are unverified, it blocks *"Polite Phishing."*

---

## 🔒 Privacy Policy

Clarity AI is designed with a **Privacy-First** philosophy:
- **No Data Collection:** We do not collect, store, or transmit your email content.
- **Local Processing:** All AI inference runs on your machine using the CPU/GPU via WebGL.
- **No Tracking:** We do not track your browsing history or personal information.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.
