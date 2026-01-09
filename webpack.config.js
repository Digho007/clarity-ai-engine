const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
  // Check which browser we are building for (Default to Chrome)
  const browser = env.browser || 'chrome';
  console.log(`🛠️  Building Clarity Engine for: ${browser.toUpperCase()}`);

  return {
    mode: 'production',
    // 1. Compile the AI code
    entry: {
      background: './src/background.js',
      content: './src/content.js',
    },
    // 2. Output to separate folders based on browser name
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, `dist-${browser}`),
      clean: true,
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { 
            from: "public",
            transform(content, absoluteFrom) {
              // 3. Intercept manifest.json and modify it on the fly
              if (absoluteFrom.includes('manifest.json')) {
                const manifest = JSON.parse(content.toString());

                // --- NEW: Allow WebAssembly (WASM) for the AI Brain ---
                manifest.content_security_policy = {
                  extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
                };

                if (browser === 'firefox') {
                  // Firefox Rule
                  manifest.background = { scripts: ["background.js"] };
                  manifest.browser_specific_settings = {
                    gecko: { id: "clarity-engine@example.com" }
                  };
                } else {
                  // Chrome/Edge/Brave Rule
                  manifest.background = { service_worker: "background.js" };
                }

                return JSON.stringify(manifest, null, 2);
              }
              return content;
            }
          }
        ],
      }),
    ],
    // Increase limits for the heavy AI file
    performance: {
      hints: false,
      maxEntrypointSize: 2000000, // 2mb
      maxAssetSize: 2000000 // 2mb
    }
  };
};
