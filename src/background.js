import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

console.log("🧠 Clarity Semantic Brain: INITIALIZING...");

let model = null;
let anchorVector = null;

// 1. THE ANCHOR (The "Platonic Ideal" of a Scam)
// We compare every email to this specific concept.
// Notice it captures URGENCY, FINANCIAL RISK, and AUTHORITY.
const SCAM_ANCHOR_TEXT = "Urgent request to verify bank account details, update password, or click link immediately to avoid account suspension or financial loss. Job offer requiring personal info.";

async function loadModel() {
  console.log("🧠 Loading TensorFlow Model... (This happens once)");
  
  // Load the "Lite" version to save memory
  model = await use.load();
  
  // Pre-calculate the vector for our Anchor text
  const embeddings = await model.embed([SCAM_ANCHOR_TEXT]);
  anchorVector = embeddings.squeeze(); // Flatten to 1D vector
  
  console.log("🧠 Semantic Anchor Calculated. Brain is READY.");
}

// Start loading immediately
loadModel();

// 2. THE MATH (Cosine Similarity)
// Returns a score from -1 (Opposite) to 1 (Identical meaning)
function calculateSimilarity(vectorA, vectorB) {
  return tf.tidy(() => {
    const dotProduct = tf.sum(tf.mul(vectorA, vectorB));
    const normA = tf.norm(vectorA);
    const normB = tf.norm(vectorB);
    return dotProduct.div(tf.mul(normA, normB)).dataSync()[0];
  });
}

// 3. THE LISTENER
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyze_text") {
    
    // Safety check: Is the brain awake?
    if (!model || !anchorVector) {
      console.log("⚠️ Brain is warming up... ignoring request.");
      return true; 
    }

    console.log(`🧠 Analyzing email length: ${request.text.length} chars...`);
    
    // Convert the incoming email to a Vector
    model.embed([request.text]).then(embeddings => {
      const emailVector = embeddings.squeeze();
      
      // Compare the two vectors
      const rawScore = calculateSimilarity(anchorVector, emailVector);
      
      // SCALE THE SCORE (Semantic Similarity is subtle)
      // A score of 0.4 is "meh". A score of 0.7 is "suspiciously close".
      // We map the range 0.3 -> 0.8 to a 0 -> 10 scale.
      let riskScore = (rawScore - 0.3) * 20; 
      
      // Clamp the values
      if (riskScore < 0) riskScore = 0;
      if (riskScore > 10) riskScore = 10;
      
      console.log(`🧠 SEMANTIC MATCH: ${rawScore.toFixed(3)} | RISK SCORE: ${riskScore.toFixed(1)}`);

      // THRESHOLD: 0.50 raw score is usually the "tipping point" for semantics
      const isThreat = rawScore > 0.50; 

      sendResponse({ isThreat: isThreat, score: riskScore.toFixed(1) });
      
      // Memory Management (Crucial for TensorFlow)
      emailVector.dispose(); 
      embeddings.dispose();
    });

    return true; // Keep channel open
  }
});
