import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is missing. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export interface CheckInAnswers {
  bodyState: string;       // 몸 상태
  mood: string;            // 전반적 기분
  emotionDescription: string; // 감정 묘사 (자유 입력)
  emotionCause: string;    // 원인 (자유 입력)
  currentNeed: string;     // 지금 필요한 것
}

export interface EmotionReport {
  coreEmotion: string;       // 핵심 감정 (한 단어)
  emotionIntensity: number;  // 감정 강도 1-10
  diagnosis: string;         // 감정 상태 진단 (2-3문장)
  background: string;        // 감정 배경 분석 (2-3문장)
  coaching: string[];        // 맞춤형 코칭 조언 (3가지)
  affirmation: string;       // 오늘의 확언 한 줄
}

export async function analyzeEmotion(answers: CheckInAnswers): Promise<EmotionReport> {
  const systemInstruction = `당신은 공감 능력이 뛰어난 감정 코치입니다.
사용자의 자가 체크인 답변을 분석하여 감정 상태를 진단하고, 따뜻하고 실용적인 코칭을 제공합니다.

규칙:
1. 판단하지 말고 공감하는 톤으로 작성합니다.
2. 모든 답변은 한국어 존댓말로 작성합니다.
3. 코칭 조언은 추상적이지 않고 바로 실천 가능한 구체적인 내용으로 작성합니다.
4. 확언(affirmation)은 사용자의 현재 감정 상태를 인정하면서도 긍정적인 방향을 담은 짧은 문장으로 작성합니다.
5. 반드시 JSON 형식으로 반환하세요.`;

  const userInput = `
몸 상태: ${answers.bodyState}
전반적 기분: ${answers.mood}
감정 묘사: ${answers.emotionDescription}
감정 원인: ${answers.emotionCause}
지금 필요한 것: ${answers.currentNeed}
  `.trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [{ parts: [{ text: userInput }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coreEmotion: {
            type: Type.STRING,
            description: "핵심 감정 키워드 (한 단어, 예: 불안, 외로움, 설렘, 피로)",
          },
          emotionIntensity: {
            type: Type.NUMBER,
            description: "감정 강도 1-10 숫자",
          },
          diagnosis: {
            type: Type.STRING,
            description: "현재 감정 상태 진단 (2-3문장, 존댓말)",
          },
          background: {
            type: Type.STRING,
            description: "감정의 배경과 맥락 분석 (2-3문장, 존댓말)",
          },
          coaching: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "실천 가능한 코칭 조언 3가지 (각각 한 문장, 존댓말)",
          },
          affirmation: {
            type: Type.STRING,
            description: "오늘의 확언 한 줄 (존댓말)",
          },
        },
        required: ["coreEmotion", "emotionIntensity", "diagnosis", "background", "coaching", "affirmation"],
      },
    },
  });

  try {
    const rawText = response.text;
    if (!rawText) throw new Error("No response from AI");
    return JSON.parse(rawText) as EmotionReport;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("AI 분석 중 오류가 발생했습니다.");
  }
}
