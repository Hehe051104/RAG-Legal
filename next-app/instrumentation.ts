export async function register() {
  // 仅在生产环境加载 @vercel/otel（Turbopack dev 模式下 import.meta.url 兼容问题）
  if (process.env.NODE_ENV === "production") {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "chatbot" });
  }
}
