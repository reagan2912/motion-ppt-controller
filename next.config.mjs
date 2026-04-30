/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-pdf / pdfjs-dist 가 canvas 등 native 모듈을 사용할 수 있어 webpack 설정 필요
  webpack: (config) => {
    // pdf.js canvas 대체
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
