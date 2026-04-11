require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

let vertexAI = null;
let vertexModel = null;

// Try to initialize Vertex AI if GCP_PROJECT_ID is set
if (process.env.GCP_PROJECT_ID) {
  try {
    const { VertexAI } = require("@google-cloud/vertexai");
    vertexAI = new VertexAI({
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_LOCATION || "us-central1",
    });
    vertexModel = vertexAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-04-17",
    });
    console.log(
      `✅ Vertex AI initialized — project: ${process.env.GCP_PROJECT_ID}`,
    );
  } catch (err) {
    console.warn(
      "⚠ Vertex AI init failed, falling back to AI Studio:",
      err.message,
    );
    vertexAI = null;
    vertexModel = null;
  }
}

// Fallback: Google AI Studio
const studioAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiVersion: "v1beta",
});
const studioModel = studioAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Generate content using whichever service is available
 */
async function generateContent(prompt, options = {}) {
  const maxTokens = options.maxTokens || 8192;
  const temperature = options.temperature || 0.4;

  if (vertexModel) {
    try {
      const request = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature,
        },
      };
      const result = await vertexModel.generateContent(request);
      const response = await result.response;
      return response.candidates[0].content.parts[0].text;
    } catch (err) {
      console.warn(
        "[geminiClient] Vertex AI failed, falling back:",
        err.message,
      );
    }
  }

  // Fallback to AI Studio — now WITH generationConfig
  const result = await studioModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: temperature,
    },
  });
  return result.response.text();
}

/**
 * Returns info about which service is active
 */
function getServiceInfo() {
  if (vertexAI && process.env.GCP_PROJECT_ID) {
    return {
      serviceName: "Google Vertex AI",
      modelName: "gemini-2.5-flash",
      isVertexAI: true,
      projectId: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_LOCATION || "us-central1",
    };
  }
  return {
    serviceName: "Google AI Studio",
    modelName: "gemini-2.5-flash",
    isVertexAI: false,
    projectId: null,
    location: null,
  };
}

/**
 * Stream content token by token — calls onChunk for each piece
 */
async function generateContentStream(prompt, onChunk, options = {}) {
  // Try Vertex AI first
  if (vertexModel) {
    try {
      const request = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.5,
        },
      };
      const streamResult = await vertexModel.generateContentStream(request);
      for await (const chunk of streamResult.stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) onChunk(text);
      }
      return;
    } catch (err) {
      console.warn(
        "[geminiClient] Vertex stream failed, falling back:",
        err.message,
      );
    }
  }

  // Fallback to AI Studio streaming
  const streamResult = await studioModel.generateContentStream(prompt);
  for await (const chunk of streamResult.stream) {
    const text = chunk.text?.() || "";
    if (text) onChunk(text);
  }
}

module.exports = { generateContent, generateContentStream, getServiceInfo };
