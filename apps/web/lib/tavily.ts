/**
 * Tavily AI Search 集成
 */

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilyResponse {
  results: TavilyResult[];
  query: string;
}

/**
 * 调用 Tavily Search API
 * @param query 搜索查询
 * @param maxResults 最大结果数（默认 5）
 */
export async function searchTavily(
  query: string,
  maxResults: number = 5
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.warn('TAVILY_API_KEY not configured, returning empty results');
    return [];
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced', // 升级为深度搜索
        max_results: maxResults,
        include_answer: false,
        include_raw_content: true, // 开启全文抓取
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data: TavilyResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Tavily search failed:', error);
    return [];
  }
}

/**
 * 并行搜索支持和反对证据
 */
export async function searchProAndCon(text: string) {
  const [proResults, conResults] = await Promise.all([
    searchTavily(`${text} 证实 支持 官方`, 5),
    searchTavily(`${text} 辟谣 质疑 反对`, 5),
  ]);

  return {
    pro: proResults,
    con: conResults,
  };
}
