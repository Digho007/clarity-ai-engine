# Clarity AI Engine (The Clarity Pause)

> **"Security that treats the human as the solution, not the problem."**

**Clarity** is a browser-based **Cognitive Security** extension that uses **Edge AI (TensorFlow.js)** to detect and neutralize social engineering attacks that bypass traditional spam filters.

Unlike standard firewalls that rely on blacklists, Clarity analyzes the **semantic intent** of email content in real-time. It enforces a "Cognitive Gap"—a mandatory 5-second pause—when high-risk persuasion patterns are detected, neutralizing the "Amygdala Hijack" used by scammers.

---

## 🚀 Key Innovation: "Polite Phishing" Detection

Traditional security tools look for "Toxic" words (e.g., "Kill," "Hate").
**Clarity looks for "Persuasive" vectors.**

It uses the **Universal Sentence Encoder (Lite)** to convert email text into 512-dimensional mathematical vectors. It then calculates the **Cosine Similarity** against a known "Scam Anchor" vector.

* **Standard Filter:** Misses *"Kindly verify your bank details."* (No toxicity).
* **Clarity Engine:** Flags it (Risk Score: **6.2/10**) because the *vector direction* matches the concept of "Urgent Financial Demand."

---

## 🏗 Technical Architecture

This engine runs **100% Client-Side** (Edge Computing). No data is ever sent to a cloud server, ensuring **GDPR/CCPA Compliance** by design.

* **Core Brain:** [TensorFlow.js](https://www.tensorflow.org/js) (running on WebAssembly backend for near-native performance).
* **Model:** Google Universal Sentence Encoder (Lite).
* **DOM Observer:** MutationObserver API for real-time dynamic content scanning (Gmail/Outlook).
* **Defense Mechanism:** CSS-based Cognitive Friction Layer (Blur + Timer).

### Diagram: The Detection Loop
```mermaid
graph LR
    A[Email Arrives] -->|DOM Scraper| B(Extract Text)
    B -->|TensorFlow.js| C{Semantic Vectorization}
    C -->|Compare vs Anchor| D[Calculate Risk Density]
    D -- Score < 5.0 --> E[Safe (Pass)]
    D -- Score > 5.0 --> F[TRIGGER: Clarity Pause]
    F -->|Apply CSS Blur| G[Enforce 5s Timer]
    G --> H[System 2 Thinking Activation]
