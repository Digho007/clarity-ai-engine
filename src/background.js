import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu'; // 1. Import the CPU backend explicitly
import * as use from '@tensorflow-models/universal-sentence-encoder';

// 2. THE FIX: Service Worker Polyfill
// TensorFlow sometimes looks for 'window' blindly. We give it 'self' instead.
if (typeof window === 'undefined') {
  self.window = self;
}

console.log("🧠 Clarity Semantic Brain: INITIALIZING...");

let model = null;
let anchorVector = null;

const SCAM_ANCHOR_TEXT = "Urgent request to verify bank account details, update password, or click link immediately to avoid account suspension or financial loss. Job offer requiring personal info.";

async function loadModel() {
  console.log("🧠 Loading TensorFlow Model... (This happens once)");

  try {
    // 3. FORCE CPU BACKEND
    // This prevents it from trying to open a WebGL window (which fails in Service Workers)
    await tf.setBackend('cpu');
    await tf.ready(); // Wait for the engine to initialize
    
    // Load the "Lite" version
    model = await use.load();
    
    // Pre-calculate the vector
    const embeddings = await model.embed([SCAM_ANCHOR_TEXT]);
    anchorVector = embeddings.squeeze();
    
    console.log("🧠 Semantic Anchor Calculated. Brain is READY.");
  } catch (err) {
    console.error("🔥 Brain Initialization Failed:", err);
  }
}

// Start loading
loadModel();

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
    
    if (!model || !anchorVector) {
      console.log("⚠️ Brain is warming up... ignoring request.");
      return true; 
    }

    console.log(`🧠 Analyzing email length: ${request.text.length} chars...`);
    
    model.embed([request.text]).then(embeddings => {
      const emailVector = embeddings.squeeze();
      const rawScore = calculateSimilarity(anchorVector, emailVector);
      
      let riskScore = (rawScore - 0.3) * 20; 
      if (riskScore < 0) riskScore = 0;
      if (riskScore > 10) riskScore = 10;
      
      console.log(`🧠 SEMANTIC MATCH: ${rawScore.toFixed(3)} | RISK SCORE: ${riskScore.toFixed(1)}`);

      // Threshold set to 0.50
      const isThreat = rawScore > 0.50; 

      sendResponse({ isThreat: isThreat, score: riskScore.toFixed(1) });
      
      emailVector.dispose(); 
      embeddings.dispose();
    });

    return true; 
  }
});
