import { rawDeepseek } from '@/lib/ai-config';
import { searchTavily } from '@/lib/tavily';
import { buildKeywordPrompt, buildFinalAnalysisPrompt } from '@/lib/prompts';
import sourceCredibility from '@/lib/data/source_credibility.json';

/**
 * 评分工具：根据域名匹配知识库权重
 */
function getSourceScore(url: string): { score: number; label: string } {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    if (sourceCredibility.A_CLASS.domains.some(d => domain.includes(d))) return { score: 1.0, label: '权威官媒' };
    if (sourceCredibility.B_CLASS.domains.some(d => domain.includes(d))) return { score: 0.8, label: '专业媒体' };
    if (sourceCredibility.C_CLASS.domains.some(d => domain.includes(d))) return { score: 0.5, label: '普通信源' };
    if (sourceCredibility.D_CLASS.domains.some(d => domain.includes(d))) return { score: 0.2, label: '社交平台' };
    return { score: 0.4, label: '未知信源' };
  } catch {
    return { score: 0.3, label: '非法链接' };
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { text } = await req.json();
    if (!text || text.length < 10) {
      return new Response(JSON.stringify({ error: '文本过短' }), { status: 400, headers: corsHeaders });
    }

    // 阶段 1：提取精准关键词
    console.log('🧠 Stage 1: Extracting Keywords...');
    const keywordResponse = await rawDeepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: buildKeywordPrompt(text) }],
      max_tokens: 50,
      temperature: 0.1,
    });
    const keywords = keywordResponse.choices[0].message.content || text;
    console.log('🔑 Keywords:', keywords);

    // 阶段 2：深度全维度搜索 (Tavily with Raw Content)
    console.log('🔍 Stage 2: Deep Searching...');
    const results = await searchTavily(keywords, 4); // 获取前 4 个最相关的结果

    // 阶段 3：信源打分与证据链构建
    console.log('📊 Stage 3: Scoring Sources...');
    const evidenceChain = results.map(res => {
      const { score, label } = getSourceScore(res.url);
      // 截取网页正文前 1500 字，防止超过 Token 限制
      const content = (res.content || '').slice(0, 1500);
      return `[信源: ${res.title}] [等级: ${label}] [权重: ${score}]\n网址: ${res.url}\n内容: ${content}\n---`;
    }).join('\n');

    // 阶段 4：最终加权核查判定 (Streaming)
    console.log('🚀 Stage 4: Final Weighted Analysis...');
    const finalResponse = await rawDeepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: buildFinalAnalysisPrompt(text, evidenceChain) }],
      stream: true,
      temperature: 0.2,
      max_tokens: 500,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) { // 这里注意变量名，应为 finalResponse
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) controller.enqueue(new TextEncoder().encode(content));
        }
        controller.close();
      },
    });

    // 修复流处理中的变量名错误
    const finalStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          for await (const chunk of finalResponse) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) controller.enqueue(encoder.encode(content));
          }
          controller.close();
        },
      });

    return new Response(finalStream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error) {
    console.error('Analysis failed:', error);
    return new Response(JSON.stringify({ error: '分析失败' }), { status: 500, headers: corsHeaders });
  }
}
