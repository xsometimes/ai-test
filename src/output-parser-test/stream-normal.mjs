/**
 * terminal执行: node ./src/output-parser-test/stream-normal.mjs
 */

import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
  },
});

const prompt = `详细介绍莫扎特的信息。`;

console.log("🌊 普通流式输出演示（无结构化）\n");

try {
    // LangChain 的 stream 方法已经帮你处理好了所有的服务器通信、数据解析、事件监听
    // 你可能听说过需要处理 SSE（Server-Sent Events）、WebSocket、数据帧解析等。但在 LangChain 中，这些都已经被封装好了
    // LangChain 已经帮你处理了：1）SSE 协议解析；2）数据帧解码；3）错误重试；4）连接管理；5）数据块合并
    const stream = await model.stream(prompt);

    let fullContent = '';
    let chunkCount = 0;

    console.log("📡 接收流式数据:\n");

    for await (const chunk of stream) {
        chunkCount++;
        const content = chunk.content;
        fullContent += content;

        process.stdout.write(content); // 实时显示流式文本
    }

    console.log(`\n\n✅ 共接收 ${chunkCount} 个数据块\n`);
    console.log(`📝 完整内容长度: ${fullContent.length} 字符`);

} catch (error) {
    console.error("\n❌ 错误:", error.message);
}