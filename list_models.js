require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.log("No API key found in .env or .env.local");
  process.exit(1);
}

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(res => res.json())
  .then(data => {
    const models = data.models || [];
    console.log("Available Gemma models:");
    models.filter(m => m.name.toLowerCase().includes('gemma')).forEach(m => {
      console.log(`- ${m.name}: ${m.description || ''} (Supported: ${m.supportedGenerationMethods.join(', ')})`);
    });
  })
  .catch(err => console.error("Error fetching models:", err));
