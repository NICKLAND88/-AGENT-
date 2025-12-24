
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const runAgentExecution = async (
  modelName: string,
  instruction: string,
  prompt: string,
  context: string = ""
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("未检测到 API_KEY 环境变量，请确保环境配置正确。");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const fullPrompt = `
角色设定: ${instruction}
前序上下文: ${context}

当前任务需求: ${prompt}
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName || 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    return response.text || "无输出结果";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "调用 Gemini API 失败");
  }
};
