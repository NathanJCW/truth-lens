import { createOpenAI } from '@ai-sdk/openai';
import OpenAI from 'openai';

/**
 * 原始 OpenAI 客户端 (用于绕过 AI SDK 的流式冲突)
 */
export const rawDeepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1',
});

/**
 * AI SDK 适配器
 */
const deepseekClient = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1',
  compatibility: 'compatible',
});

export function getAnalysisModel() {
  return deepseekClient('deepseek-chat');
}
