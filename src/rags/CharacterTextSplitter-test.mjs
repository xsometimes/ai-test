/**
 * terminal：执行 node ./src/rags/CharacterTextSplitter-test.mjs
 * 
 * 
 */


import "dotenv/config";
import "cheerio";
import { CharacterTextSplitter, RecursiveCharacterTextSplitter, TokenTextSplitter } from "@langchain/textsplitters";
import { Document } from '@langchain/core/documents';
import { getEncoding, getEncodingNameForModel } from 'js-tiktoken';

const logDocument = new Document({
  pageContent: `[2024-01-15 10:00:00] INFO: Application started
    [2024-01-15 10:00:05] DEBUG: Loading configuration file
    [2024-01-15 10:00:10] INFO: Database connection established
    [2024-01-15 10:00:15] WARNING: Rate limit approaching
    [2024-01-15 10:00:20] ERROR: Failed to process request
    [2024-01-15 10:00:25] INFO: Retrying operation
    [2024-01-15 10:00:30] SUCCESS: Operation completed
    [2026-01-10 14:30:00] INFO: 系统开始执行大规模数据迁移任务，本次迁移涉及核心业务数据库中的用户表、订单表、商品库存表、物流信息表、支付记录表、评论数据表等共计十二个关键业务表，预计处理数据量约500万条记录，数据总大小预估为280GB，迁移过程将采用分批次增量更新策略以减少对生产环境的影响，同时启用双写机制确保数据一致性，任务预计总耗时约3小时15分钟，迁移完成后将自动触发全面的数据一致性校验流程以及性能基准测试，请相关运维人员和DBA团队密切关注系统资源使用情况、网络带宽占用率以及任务执行进度，如遇异常情况请立即启动应急预案并通知技术负责人`
});


// test0 
// const logTextSplitter = new CharacterTextSplitter({
//   separator: '\n',
//   chunkSize: 200,
//   chunkOverlap: 20
// });


// test1 这种递归的方式灵活太多了。
// const logTextSplitter = new RecursiveCharacterTextSplitter({
//   chunkSize: 150,
//   chunkOverlap: 20,
//   separator: ['\n', '。', '，'], // 可以指定多个分隔符，当 “\n” 分割后还是大，就会用 “。” 还是不行再尝试用 “，”
// });

const modelName = 'gpt-4';
// 根据模型名称，返回该模型使用的编码器名称。不同的 OpenAI 模型使用不同的分词器（tokenizer）
const encodingName = getEncodingNameForModel(modelName);
const enc = getEncoding(encodingName);


// test2 
// const logTextSplitter = new TokenTextSplitter({
//   chunkSize: 50, // 每个块最多 50 个 Token
//   chunkOverlap: 10, // 块之间重叠 10 个 Token
//   encodingName: encodingName, // OpenAI 使用的编码方式
// });


// test3：用 RecursiveCharacterTextSplitter 的分割方式，然后按照 token 长度来设置 chunk size
// chunk size 指的就是 token 的长度
const logTextSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 150,
  chunkOverlap: 20,
  separator: ['\n', '。', '，'],
  lengthFunction: (text) => enc.encode(text).length
});

const splitDocuments = await logTextSplitter.splitDocuments([logDocument]);

// console.log(splitDocuments);



splitDocuments.forEach(document => {
  console.log(document);
  console.log('charater length:',document.pageContent.length);
  console.log('token length:',enc.encode(document.pageContent).length);
});

/**
 * chunk 的大小也没有到 200
 * 因为 splitter 会优先保证语义完整，宁愿 chunk 小一点。
 * 到了 160 左右字符的时候，发现加上下一个文本就超过 200 了，所以会放到下一个块。
 */