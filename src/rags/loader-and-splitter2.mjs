/**
 * terminal执行：node ./src/rags/loader-and-splitter2.mjs 
 * 
 */

import "dotenv/config";
import "cheerio";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from"@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

const model = new ChatOpenAI({
  temperaure: 0,
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  batchSize: 10, // 明确指定批次大小。因为有的文件批量大小超过了模型允许的限制
});

const cheerioLoader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7614057963394711567",
  {
    selector: '.main-area p'
  }
);

const documents =  await cheerioLoader.load();

console.assert(documents.length === 1);
console.log(`Total characters：${documents[0].pageContent.length}`);

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500, // 每个分块的字符数
  chunkOverlap: 50, // 分块之间的重叠字符数
  separators: ["。", "！", "？"], // 分隔符，优先使用段落分隔
});

const splitDocuments = await textSplitter.splitDocuments(documents);
console.log(`文档分割完成，共 ${splitDocuments.length} 个分块\n`);

console.log("正在创建向量存储...");
const vectorstore = await MemoryVectorStore.fromDocuments(
  splitDocuments,
  embeddings,
);
console.log(`向量存储创建完成\n`);

const retriever = vectorstore.asRetriever({
  k: 2
});

const questions = [
  "四要素概括下事件",
  "react开发者的一些设计、意图",
];

// RAG 流程：对每个问题进行检索和回答
for (const [qIdx, question] of questions.entries()) {
  console.log("=".repeat(80));
  console.log(`问题: ${question}${qIdx + 1}`);
  console.log("=".repeat(80));

  // 使用retriever获取相关文档
  const retrievedDocs = await retriever.invoke(question);

  // 使用similaritySearchWithScore获取相似度评分
  const scoredResults = await vectorstore.similaritySearchWithScore(question, 2);

  // 打印检索到的文档和相似度评分
  console.log("\n【检索到的文档及相似度评分】");

  retrievedDocs.forEach((doc, i) => {
    // 找到对应的评分
    const scoredResult = scoredResults.find(([scoredDoc]) => scoredDoc.pageContent === doc.pageContent);
    const score = scoredResult ? scoredResult[1] : null;
    const similarity = score !== null ? (1 - score).toFixed(4) : 'N/A';
    console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`);
    console.log(`内容: ${doc.pageContent}`);
    
    if (doc.metadata && Object.keys(doc.metadata).length > 0) {
      console.log(`元数据：${doc.metadata}`);
    }
  });


  // 构建prompt
  const context = retrievedDocs.map((doc, i) => `[片段${i + 1}]`).join("\n\n━━━━━\n\n");

  const prompt = `你是一个文章辅助阅读助手，根据文章内容来解答：
                  \n文章内容：${context}
                  \n问题: ${question}
                  \n你的回答：`;

  console.log("\n【AI 回答】");
  const response = await model.invoke(prompt);
  console.log(response.content);
  console.log("\n");

}


// 1. 检索时候调用了两次检索，vectorStore.similaritySearchWithScore 返回了 pageContent 和评分，为什么还需要 retriever.invoke(question)
// 确实。vectorStore.similaritySearchWithScore(question, 2) 是拿到问题最相关的两个文档和评分，
// retriever.invoke(question) 是拿到最相关的文档，两者二选一即可。
// 上节是为了演示各种 API 才这么写，下节开始直接调用 similaritySearchWithScore

// 2. Puppeteerwebbaseloader和cheeriowebbaseloader的区别
// PuppeteerWebBaseLoader：
//    通过 puppeteer 启动一个真实的无头浏览器（Headless Browser）来加载网页 
//    支持渲染动态网页。对于使用 React、Vue 等框架构建的、内容由 JS 动态加载的单页应用（SPA），它能拿到最终的完整 HTML
// CheerioWebBaseLoader：
//     用 cheerio 库在 Node.js 环境中解析HTML文本 。它不运行 JavaScript，只处理服务器返回的静态源代码。
//    不支持渲染动态内容。如果网页内容是通过 JS 后来插入的，它无法抓取到

