import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';


const COLLECTION_NAME = 'ebook_collection';
const VECTOR_DIM = 1024;

const model = new ChatOpenAI({
  temperature: 0.7,
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
    baseURL: process.env.OPENAI_BASE_URL
  },
  dimensions: VECTOR_DIM
});

const client =  new MilvusClient({
  address: process.env.MILVUS_HOST,
  port: process.env.MILVUS_PORT,
  username: process.env.MILVUS_USERNAME,
  token: process.env.MILVUS_TOKEN,
});

async function getEmbedding(text) {
  const result = await embeddings.embedQuery(text);
  return result;
}

// 从milvus中检索相关的电子书的内容
async function retrieveRelevantContent(question, k = 3) {
  try {
    const queryVector = await getEmbedding(question);

    const searchResult = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ['id', 'book_id', 'chapter_num', 'index', 'content']
    });

    return searchResult.results;

  } catch (error) {
    console.error('检索内容时出错:', error.message);
    return [];
  }
}

// 使用rag回答关于《优势谈判》的问题
async function answerEbookQuestion(question, k = 3) {
  try {
    console.log('='.repeat(80));
    console.log(`问题: ${question}`);
    console.log('='.repeat(80));

    console.log('\n【检索相关内容】');
    const retrieveContent = await retrieveRelevantContent(question, k);

    if (retrieveContent.length === 0) {
      console.log('未找到相关内容');
      return'抱歉，我没有找到相关的《优势谈判》内容。';
    }

    retrieveContent.forEach((item, i) => {
      console.log(`\n[片段 ${i + 1}] 相似度: ${item.score.toFixed(4)}`);
      console.log(`书籍: ${item.book_id}`);
      console.log(`章节: 第 ${item.chapter_num} 章`);
      console.log(`片段索引: ${item.index}`);
      console.log(`内容: ${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}`);
    });

    const context = retrieveContent.map((item, i) => {
      return `[片段 ${i + 1}]
                章节: 第 ${item.chapter_num} 章
                内容: ${item.content}`;
    }).join('\n\n━━━━━\n\n');


    const prompt = `你是一个专业的商务谈判助手。基于书本内容回答问题，用准确、详细的语言。

                    请根据以下《优势谈判》片段内容回答问题：
                    ${context}

                    用户问题: ${question}

                    回答要求：
                    1. 如果片段中有相关信息，请结合书本内容给出详细、准确的回答
                    2. 可以综合多个片段的内容，提供完整的答案
                    3. 如果片段中没有相关信息，请如实告知用户
                    4. 回答要准确，符合书本的观点和场景
                    5. 可以引用原文内容来支持你的回答

                    AI 助手的回答:`; 
    
    console.log('\n【AI 回答】');
    const response =  await model.invoke(prompt);
    console.log(response.content);
    console.log('\n');

    return response.content;
  } catch (error) {
    console.error('回答问题时出错:', error.message);
    return'抱歉，处理您的问题时出现了错误。';
  }
}

async function main(params) {
  try {
    console.log('连接到 Milvus...');
    await client.connectPromise;
    console.log('✓ 已连接\n');


    try {
      await client.loadCollection({
        collection_name: COLLECTION_NAME,
      });

      console.log('✓ 集合已加载\n');
    } catch (error) {
      if (!error.message.includes('already loaded')) {
        throw error;
      }

      console.log('✓ 集合已处于加载状态\n');
    }

    await answerEbookQuestion('展会上，面对众多对手，如何说服客户选择你家的产品？请结合你在书中学到的理论回答，必要时可举例说明', 1);


  } catch (error) {
    console.error('错误:', error.message);
  }
}

main();
