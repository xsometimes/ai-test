/**
 * 
 * terminal执行: node ./src/rags/hello-rag2.mjs
 * 
 * rag2 文件是针对1存在的问题扩展
 * retrieverDocs的retriever.invoke(question)： 演示生产环境怎么用（只拿文档）
 * scoreResults的similaritySearchWithScore(question, 3)	： 是调试级接口，返回文档+分数
 * 二者的k值是独立的，二者都有向量化
 * 1中搜索出了k=1个文档，然后给k=3个文档打分，是浪费的
 * 神光写这两个，出于教学演示
 * 实际开发中，实际项目中，不会同时调用两次，那样确实浪费。
 * 
 *  ================================================================================
 * 
 * ！！！！！！
 * 尝试后，发现上述的想法的是错误，因为若去掉retriever，只剩下similaritySearchWithScore，
 * 会发现，ai返回的结果是查询不到，感觉没有文档。retriever 的核心就是从知识库里取东西
 * 如：
 * AI 回答】
 * 哎呀，小朋友，你要知道光光是哪种性格的小朋友啊？可是你看，我们这两个故事片段都还是空白的呢！就像一张白纸一样，还没有画上光光的样子。
 * 要了解一个朋友是什么性格，我们得先听听他的故事，看看他平时喜欢做什么，遇到困难时怎么想，和朋友们在一起时是怎么样的。现在我们的故事纸上什么都没有，所以还不能说光光是哪种性格的小朋友呢！
 * 不过没关系，等你的故事写好了，老师一定很乐意和你一起分析光光是个什么样的小朋友，他会是善于思考的类型，还是会动手实践的类型，或者是其他特别可爱的地方。每个小朋友都有自己独特的性格，都很珍贵呢！
 *
 * 
 * ================================================================================
 * 
 * 逻辑1（期望的逻辑）：检索后的文档，再进行打分
 * 逻辑2（实际的方式）：检索和打分是同一件事
 *  向量搜索的机制决定了分数是副产品：当你执行向量搜索时，数据库内部已经在计算分数了。分数是搜索过程的必然产物，不是额外步骤
 *  
 * 
 */

import 'dotenv/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';

const model = new ChatOpenAI({
  temperature: 0,
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  },
});

// 嵌入模型 OpenAIEmbeddings
const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  },
});


const documents = [
  new Document({
    pageContent: `光光是一个活泼开朗的小男孩，他有一双明亮的大眼睛，总是带着灿烂的笑容。光光最喜欢的事情就是和朋友们一起玩耍，他特别擅长踢足球，每次在球场上奔跑时，就像一道阳光一样充满活力。`,
    metadata: { 
      chapter: 1, 
      character: "光光", 
      type: "角色介绍", 
      mood: "活泼"
    },
  }),
  new Document({
    pageContent: `东东是光光最好的朋友，他是一个安静而聪明的男孩。东东喜欢读书和画画，他的画总是充满了想象力。虽然性格不同，但东东和光光从幼儿园就认识了，他们一起度过了无数个快乐的时光。`,
    metadata: { 
      chapter: 2, 
      character: "东东", 
      type: "角色介绍", 
      mood: "温馨"
    },
  }),
  new Document({
    pageContent: `有一天，学校要举办一场足球比赛，光光非常兴奋，他邀请东东一起参加。但是东东从来没有踢过足球，他担心自己会拖累光光。光光看出了东东的担忧，他拍着东东的肩膀说："没关系，我们一起练习，我相信你一定能行的！"`,
    metadata: {
      chapter: 3,
      character: "光光和东东",
      type: "友情情节",
      mood: "鼓励",
    },
  }),
  new Document({
    pageContent: `接下来的日子里，光光每天放学后都会教东东踢足球。光光耐心地教东东如何控球、传球和射门，而东东虽然一开始总是踢不好，但他从不放弃。东东也用自己的方式回报光光，他画了一幅画送给光光，画上是两个小男孩在球场上一起踢球的场景。`,
    metadata: {
      chapter: 4,
      character: "光光和东东",
      type: "友情情节",
      mood: "互助",
    },
  }),
  new Document({
    pageContent: `比赛那天终于到了，光光和东东一起站在球场上。虽然东东的技术还不够熟练，但他非常努力，而且他用自己的观察力帮助光光找到了对手的弱点。在关键时刻，东东传出了一个漂亮的球，光光接球后射门得分！他们赢得了比赛，更重要的是，他们的友谊变得更加深厚了。`,
    metadata: {
      chapter: 5,
      character: "光光和东东",
      type: "高潮转折",
      mood: "激动",
    },
  }),
  new Document({
    pageContent: `从那以后，光光和东东成为了学校里最要好的朋友。光光教东东运动，东东教光光画画，他们互相学习，共同成长。每当有人问起他们的友谊，他们总是笑着说："真正的朋友就是互相帮助，一起变得更好的人！"`,
    metadata: {
      chapter: 6,
      character: "光光和东东",
      type: "结局",
      mood: "欢乐",
    },
  }),
  new Document({
    pageContent: `多年后，光光成为了一名职业足球运动员，而东东成为了一名优秀的插画师。虽然他们走上了不同的道路，但他们的友谊从未改变。东东为光光设计了球衣上的图案，光光在每场比赛后都会给东东打电话分享喜悦。他们证明了，真正的友情可以跨越时间和距离，永远闪闪发光。`,
    metadata: {
      chapter: 7,
      character: "光光和东东",
      type: "尾声",
      mood: "温馨",
    },
  }),
];

// 知识库里存的就是这些文档，可以加一些元数据。
const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  embeddings,
);

// 用嵌入模型把这些文档向量化之后存入向量数据库。
// 并且返回一个 retriever，k 是 3 就是返回余弦相似度最大的 2 个 Document。
const retriever = vectorStore.asRetriever({
  k: 2,
  includeScore: true
});

const questions = [
  '为光光写一个超简单的人物百科。',
  '你觉得光光偏向哪种MBTI？',
  '评价下光光的友情。'
];

for (let [qidx, question] of questions.entries()) {

  // 1, 展示问题
  console.log("=".repeat(80));
  console.log(`问题${qidx + 1}: ${question}`);
  console.log("=".repeat(80));


  // 2-1 使用 retriever 获取文档、向量化
  // const retrieverDocs =  await retriever.invoke(question); 

  // 2-2 使用 similaritySearchWithScore 获取相似度评分
  const scoreResults =  await vectorStore.similaritySearchWithScore(question, 2);
  console.log(`\n 【检索到的文档${scoreResults.length}段】`);

  if (scoreResults.length > 0) {
    scoreResults.forEach(([doc, score], i) => {
      // 找到对应的评分
      // const scoreResult = scoreResults.find(([scoredDoc]) => scoredDoc.pageContent === doc.pageContent);
      // const score = doc ? doc[1] : null;
      const similarity = score !== null ? (1 - score).toFixed(4) : 'N/A';
  
      console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`);
      console.log(`内容: ${doc.pageContent}`);
      console.log(`元数据: 章节=${doc.metadata.chapter}, 角色=${doc.metadata.character}, 类型=${doc.metadata.type}, 心情=${doc.metadata.mood}`);
    });
    // 创建 prompt
    const context = scoreResults.map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`).join('\n\n=================\n\n');

    // 增强后的 prompt
    const prompt = `你是一个讲友情故事的老师。基于以下故事片段回答问题，用温暖生动的语言。如果故事中没有提到，就说"这个故事里还没有提到这个细节"。
                    \n 故事片段：${context}
                    \n 问题：${question}
                    \n 老师的回答：`;

    console.log("\n【AI 回答】");
    const response = await model.invoke(prompt);
    console.log(response.content);
    console.log('\n');
  }

  
  

}
