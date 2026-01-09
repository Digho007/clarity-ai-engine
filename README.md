# Clarity AI Engine (The "Cognitive Pause")

![Status](https://img.shields.io/badge/Status-Functional_Prototype-success) ![Stack](https://img.shields.io/badge/Tech-TensorFlow.js%20%7C%20WASM%20%7C%20Edge_AI-blue) ![License](https://img.shields.io/badge/License-Apache_2.0-orange)

> **"Traditional security blocks the threat. Clarity upgrades the human."**

**Clarity** is a browser-based security engine that uses **Local Artificial Intelligence** to detect social engineering attacks that bypass standard spam filters.

Unlike legacy tools that look for "bad keywords" (e.g., *kill, hate, virus*), Clarity reads the **semantic intent** of an email. It detects when a sender is using high-pressure psychological tactics—even in polite language—and enforces a mechanical **"Cognitive Pause"** (a 5-second interaction lockout) to help the user regain rational control.

---

## 🎯 The Problem: "Polite Phishing"
Modern attackers don't use obvious threats. They use **Social Engineering**:
* *Old Attack:* "CLICK HERE TO WIN $1,000,000!!!" (Easy to block)
* *New Attack:* "Hi Jeremiah, kindly verify the attached invoice for the marketing team by 5 PM." (Hard to block)

Because the new attack uses polite, professional language, standard filters miss it.

## 💡 The Solution: Edge AI + Cognitive Friction
Clarity runs a deep learning model (**Universal Sentence Encoder**) directly inside your web browser.
1.  **It Reads:** It converts email text into mathematical vectors (numbers representing meaning).
2.  **It Compares:** It measures the distance between the email's meaning and a known "Scam Concept."
3.  **It Intervenes:** If the risk is high, it blurs the email and forces a **5-second countdown** before you can click anything.

---

## 🏗️ Technical Architecture
This project is built on a **Zero-Trust, Zero-Data-Exfiltration** architecture.

| Component | Technology Used | Function |
| :--- | :--- | :--- |
| **The Brain** | **TensorFlow.js** (Universal Sentence Encoder) | Calculates vector embeddings for incoming text. |
| **The Backend** | **WebAssembly (WASM)** | Accelerates AI math to near-native speeds inside the browser. |
| **The Eyes** | **MutationObserver API** | Watches the Gmail/Outlook DOM for new messages in real-time. |
| **The Shield** | **CSS3 Filters + JavaScript** | Enforces the blur and the countdown timer. |

**Privacy Note:** This is an **Edge AI** solution. No data is ever sent to a cloud server. All analysis happens 100% locally on your device.

---

## 🚀 Installation Guide (How to Run This)

Follow these steps to install the engine on your own computer.

### Prerequisites
* **Node.js** (Version 16 or higher)
* **NPM** (Included with Node.js)
* **Google Chrome** or **Firefox**

### Step 1: Download the Source Code
# Clone this repository
git clone [https://github.com/Digho007/clarity-ai-engine.git]

# Go into the project folder
cd clarity-ai-engine

# Clarity AI Engine (The Clarity Pause)

> **"Security that treats the human as the solution, not the problem."**

---

## 📦 Installation & Setup

### Step 2: Install Dependencies
We use specific AI libraries that require legacy peer dependency handling.

```bash
npm install
```

### Step 3: Build the Engine
This command compiles the AI model and bundles the JavaScript for the browser.

```bash
npm run build:all
```

You will now see two new folders:
- `dist-chrome`
- `dist-firefox`

### Step 4: Load into Your Browser

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

## 🧪 How to Test It (See the AI Think)

Once the extension is installed, you can verify it works by simulating a "Polite Phishing" attack.

### Open the Console:
1. Right-click the extension icon and select **Inspect Popup** (or open the background console).
2. Wait until you see the log: `🧠 Semantic Anchor Calculated. Brain is READY.`

### Go to Gmail:
1. Open your inbox.
2. Send yourself a test email:

   **Subject:** Urgent Update  
   **Body:** "Dear Employee, we are updating our payroll system. Kindly click the link below to confirm your login details immediately to avoid delay in payment."

### Watch the Magic:
- The extension will detect the **"Urgency"** and **"Financial Request"** vectors.
- The email links will **Blur**.
- A **Red Warning Box** will appear.
- The **"blurred links"** will be **Disabled when you click verified.**

---

## 🗺️ Roadmap & Future Improvements
- [ ] **Safari Support:** Porting the Manifest V3 to WebKit.
- [ ] **Personalized Learning:** Allowing users to "Teach" the AI about false positives locally.
- [ ] **Visual Analysis:** Adding Computer Vision to detect fake logos in email headers.

---

## 📜 License

This project is open-source and available under the **Apache 2.0 License**.

- **Commercial Use:** Allowed
- **Modification:** Allowed
- **Patent Use:** Explicitly granted

---

**Created by:**  
**Jeremiah**  
*Cybersecurity Innovator & Engineer*
