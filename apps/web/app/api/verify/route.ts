import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Mock provider since we don't have a real API key yet
const mockModel = {
  doGenerate: async () => ({
    text: "This is a mock verification result from Truth Lens. We have analyzed the claim and found it to be mostly accurate with some nuances.",
    finishReason: 'stop',
    usage: { promptTokens: 0, completionTokens: 0 },
  }),
  doStream: async () => {
    const text = "这是一条来自 Truth Lens 的模拟验证信息。经过分析，该说法基本属实，但存在以下背景信息需要补充：1. 原始事件发生在... 2. 相关方已于昨日发布声明。";
    const chunks = text.split('').map(char => ({ type: 'text-delta', textDelta: char }));
    
    let index = 0;
    const stream = new ReadableStream({
      async pull(controller) {
        if (index < chunks.length) {
          // Add a small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
          controller.enqueue(chunks[index++]);
        } else {
          controller.close();
        }
      }
    });
    
    return {
      stream,
      rawCall: { rawPrompt: null, rawSettings: {} },
      warnings: []
    };
  }
};

export async function POST(req: Request) {
  const { text } = await req.json();

  // In a real app, you'd use a real model like:
  // const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const result = await streamText({ model: openai('gpt-4o'), prompt: `Verify: ${text}` });

  // For now, use our mock stream
  const result = await streamText({
    model: mockModel as any,
    prompt: `Verify: ${text}`,
  });

  return result.toDataStreamResponse();
}
