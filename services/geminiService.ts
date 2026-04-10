import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Solves a language learning quiz question using Gemini.
 * @param context The surrounding text or HTML of the question.
 * @param question The specific question text.
 * @returns The correct answer and an explanation.
 */
export const solveQuizQuestion = async (context: string, question: string) => {
  try {
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      You are an expert English tutor helping a student verify their answers on Busuu.
      
      Context/Scenario: "${context}"
      Question/Task: "${question}"
      
      Please analyze the question and provide the strictly correct answer in English.
      If it's a multiple choice, choose the best fit.
      If it's a fill-in-the-blank, provide the missing word(s).
      
      Return the response in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING, description: "The correct answer to the question." },
            explanation: { type: Type.STRING, description: "A brief explanation of why this answer is correct." },
            confidence: { type: Type.NUMBER, description: "Confidence level from 0 to 1." }
          },
          required: ["answer", "explanation"]
        }
      }
    });

    return JSON.parse(response.text || '{}');

  } catch (error) {
    console.error("Error solving quiz:", error);
    throw error;
  }
};