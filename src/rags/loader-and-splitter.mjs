import "dotenv/config";
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";

const cheerioLoader = new CheerioWebBaseLoader(
  'https://juejin.cn/post/7584110439933100078',
  {
    selector: '.main-area p'
  }
);

const documents = await cheerioLoader.load();

// console.log(documents);

// document太大了，分割下
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400, // 每个分快的字符数
  chunkOverlap: 50, // 分块之间的重叠字符数
  separators: ["。", "！", "？"], // 分隔符，优先使用段落分隔
});

const splitDocuments = await textSplitter.splitDocuments(documents);

console.log(splitDocuments);
// 文档被分成了 几 个小的文档。每个文档是都是 400 字符左右，前后重复了 50 个字符。这样分割好的文档用来做 RAG 性能显然会更好，不需要加载整个大文档

