/** @type {import('next').NextConfig} */
const nextConfig = {
  // 抑制文件系统基准测试警告（Next.js 15 已知问题）
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // 生产环境需要配置 CORS（允许浏览器插件访问）
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
