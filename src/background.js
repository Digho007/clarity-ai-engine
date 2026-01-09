import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as use from '@tensorflow-models/universal-sentence-encoder';

// POLYFILL
if (typeof window === 'undefined') {
  self.window = self;
}

console.log("🧠 Clarity Ensemble Brain: INITIALIZING...");

let model = null;
let anchorTensors = {}; // Stores multiple vectors

// --- THE ROBUST DEFENSE: MULTI-VECTOR ANCHORS ---
// We define specific concepts for different types of attacks.
const ANCHOR_TEXTS = {
  finance: "Urgent request to verify bank account details, wire transfer, update payment information, or avoid financial loss.",
  job: "Job offer from luxury brand requiring login via Facebook or social media. High salary remote work opportunity asking for personal details.",
  security: "Your account has been compromised. Click link to reset password immediately. Suspicious login attempt detected.",
  urgency: "Immediate action required. Do not ignore this message. Final notice before account suspension."
};

async function loadModel() {
  console.log("🧠 Loading TensorFlow Model...");

  try {
    await tf.setBackend('cpu');
    await tf.ready();
    
    model = await use.load();
    
    // BATCH EMBEDDING: Convert all anchors to math at once
    console.log("🧠 Calculating Ensemble Vectors...");
    
    // 1. Finance Vector
    const financeEmb = await model.embed([ANCHOR_TEXTS.finance]);
    anchorTensors.finance = financeEmb.squeeze();

    // 2. Job Vector (Fixes Louis Vuitton)
    const jobEmb = await model.embed([ANCHOR_TEXTS.job]);
    anchorTensors.job = jobEmb.squeeze();

    // 3. Security Vector
    const secEmb = await model.embed([ANCHOR_TEXTS.security]);
    anchorTensors.security = secEmb.squeeze();

    // 4. Urgency Vector
    const urgEmb = await model.embed([ANCHOR_TEXTS.urgency]);
    anchorTensors.urgency = urgEmb.squeeze();
    
    console.log("🧠 All Neural Heads Ready.");
    
    // Cleanup temporary tensors
    financeEmb.dispose(); jobEmb.dispose(); secEmb.dispose(); urgEmb.dispose();

  } catch (err) {
    console.error("🔥 Brain Initialization Failed:", err);
  }
}

loadModel();

// Cosine Similarity Math
function calculateSimilarity(vectorA, vectorB) {
  return tf.tidy(() => {
    const dotProduct = tf.sum(tf.mul(vectorA, vectorB));
    const normA = tf.norm(vectorA);
    const normB = tf.norm(vectorB);
    return dotProduct.div(tf.mul(normA, normB)).dataSync()[0];
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyze_text") {
    
    // Check if all heads are ready
    if (!model || Object.keys(anchorTensors).length < 4) {
      console.log("⚠️ Brain is warming up...");
      return true; 
    }

    console.log(`🧠 Scanning content (${request.text.length} chars)...`);
    
    model.embed([request.text]).then(embeddings => {
      const emailVector = embeddings.squeeze();
      
      // --- ENSEMBLE CHECK ---
      // We check the email against ALL 4 anchors and take the HIGHEST score.
      
      const scores = {
        finance: calculateSimilarity(anchorTensors.finance, emailVector),
        job: calculateSimilarity(anchorTensors.job, emailVector),
        security: calculateSimilarity(anchorTensors.security, emailVector),
        urgency: calculateSimilarity(anchorTensors.urgency, emailVector)
      };

      // Find the Max Score
      const maxRawScore = Math.max(scores.finance, scores.job, scores.security, scores.urgency);
      
      // Determine which category triggered the alarm (for debugging)
      const detectedCategory = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

      // Scale Score (0.3 -> 0.8 scale mapped to 0 -> 10)
      let riskScore = (maxRawScore - 0.3) * 20;
      if (riskScore < 0) riskScore = 0;
      if (riskScore > 10) riskScore = 10;
      
      console.log(`🧠 ANALYSIS RESULT:`);
      console.log(`   - Highest Match: [${detectedCategory.toUpperCase()}]`);
      console.log(`   - Raw Similarity: ${maxRawScore.toFixed(3)}`);
      console.log(`   - Final Risk Score: ${riskScore.toFixed(1)}`);

      // ROBUST THRESHOLD: 0.50
      const isThreat = maxRawScore > 0.50; 

      sendResponse({ isThreat: isThreat, score: riskScore.toFixed(1), category: detectedCategory });
      
      emailVector.dispose(); 
      embeddings.dispose();
    });

    return true; 
  }
});
