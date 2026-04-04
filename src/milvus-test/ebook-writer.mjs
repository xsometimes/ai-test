/**
 * terminal执行: node ./src/milvus-test/ebook-writer.mjs
 */

import 'dotenv/config';
import { parse } from 'path';

// Milvus 的枚举类型，定义字段类型、距离度量、索引类型
import { MilvusClient, DataType, MetricType, IndexType } from '@zilliz/milvus2-sdk-node';

import { OpenAIEmbeddings } from '@langchain/openai';


// 加载 EPUB 电子书文件，按章节读取内容
// EPubLoader 在解析 EPUB 文件时的工作流程是：
// 用 epub2 读取 EPUB 文件结构
// 提取每个章节的 HTML 内容（EPUB 内部内容就是 HTML 格式）
// 用 html-to-text 将 HTML 转换成纯文本
// 返回 Document 对象
import { EPubLoader } from '@langchain/community/document_loaders/fs/epub';

// 递归文本分割器，在段落/句子边界处智能切分
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// import { existsSync, statSync } from 'node:fs';

const COLLECTION_NAME = 'ebook_collection'; // Milvus 中的集合名（类似 MySQL 的表名）
const VECTOR_DIM = 1024; // 向量维度，必须和嵌入模型输出维度一致
const CHUNK_SIZE = 500;  // 拆分到500个字符，每个文本块的最大字符数
const EPUB_FILE = './youshitanpan.epub';


// 确认文件是否存在
// console.log(`尝试读取: ${EPUB_FILE}`);
// console.log(`文件是否存在: ${existsSync(EPUB_FILE)}`);

// if (existsSync(EPUB_FILE)) {
//   const stats = statSync(EPUB_FILE);
//   console.log(`文件大小: ${stats.size} 字节`);
// }

// 从文件名提取书名（去掉扩展名）
const BOOK_NAME = parse(EPUB_FILE).name;


// 初始化embeddings模型
// OpenAIEmbeddings 的作用：
// 将文本转换成向量（一串浮点数）
// embedQuery(text)：单条文本 → 向量
// dimensions: 1024：指定输出向量的维度
const emembeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  },
  dimensions: VECTOR_DIM
});



// 连接到你配置的 Milvus 服务（本地 Docker 或 Zilliz Cloud）
// 执行集合创建、数据插入、向量搜索等操作
// 初始化 milvus客户端
const client = new MilvusClient({
  address: process.env.MILVUS_HOST,
  port: process.env.MILVUS_PORT,
  username: process.env.MILVUS_USERNAME,
  token: process.env.MILVUS_TOKEN,
});



// 这个函数接收一段文本，调用 OpenAI API，返回对应的向量（1024 维浮点数数组）
async function getEmbedding(text) {
  const result = await emembeddings.embedQuery(text);
  return result;
}

// 创建/获取集合
async function ensureCollection(bookId) {
  try {
    // 检查集合是否存在
    const hasCollection = await client.hasCollection({
      collection_name: COLLECTION_NAME,
    });

    if (!hasCollection.value) {
      console.log('创建集合...');
      
      await client.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
          { name: 'id', data_type: DataType.VarChar, max_length: 100, is_primary_key: true },
          { name: 'book_id', data_type: DataType.VarChar, max_length: 100 },
          { name: 'book_name', data_type: DataType.VarChar, max_length: 200 },
          { name: 'chapter_num', data_type: DataType.Int32 },
          { name: 'index', data_type: DataType.Int32, },

          // 原始文本内容（检索后返回给用户）
          { name: 'content', data_type: DataType.VarChar, max_length: 10000 },

          // 文本的向量表示（用于相似度搜索）
          { name: 'vector', data_type: DataType.FloatVector, dim: VECTOR_DIM }
        ]
      });
      console.log('✓ 集合创建成功');


      // 创建索引
      console.log('创建索引...');
      await client.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: 'vector',
        index_type: IndexType.IVF_FLAT, // 倒排索引，适合百万级向量
        metric_type: MetricType.COSINE, // 余弦相似度，适合语义相似度计算
        params: { nlist: 1024 } // nlist: 1024：聚类数量，影响检索速度和精度
      });
      console.log('✓ 索引创建成功');

    }

    // 确保集合已加载
    try {

      // 加载集合到内存（Milvus 需要显式加载才能搜索）
      await client.loadCollection({
        collection_name: COLLECTION_NAME
      });
      console.log('✓ 集合已加载');
    } catch (error) {
      console.log('✓ 集合已处于加载状态');
    }

  } catch (error) {
    console.error('创建集合时出错:', error.message);
    throw error;
  }
}

// 将文档块批量插入到milvus 流式处理
async function insertChunksBatch(chunks, bookId, chapterNum) {
  try {
    if (chunks.length === 0) {
      return 0;
    }

    // 为每个文档快生成向量并构建插入数据
    const insertData = await Promise.all(
      chunks.map(async (chunk, chunkIndex) => {
        const vector = await getEmbedding(chunk); // 对每个 chunk 调用 getEmbedding() 获取向量
        // 手动生成id：book_id_chapterNum_index
        return {
          id: `${bookId}_${chapterNum}_${chunkIndex}`,
          book_id: bookId,
          book_name: BOOK_NAME,
          chapter_num: chapterNum,
          index: chunkIndex,
          content: chunk,
          vector: vector,
        }
      })
    );

    // 能量插入到milvus
    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: insertData
    });

    return Number(insertResult.insert_cnt) || 0;

  } catch (error) {
    console.error(`插入章节 ${chapterNum} 的数据时出错:`, error.message);
    console.error('错误详情:', error);
    throw error;
  }
  
}

// 加载epub文件并进行流式处理（边处理边插入）
async function loadAndProcessEPubStreaming(bookId) {
  try {
    console.log(`\n开始加载 EPUB 文件: ${EPUB_FILE}`);

    // 1. 加载 EPUB（按章节）
    // 使用EPubLoader加载文件，按章节拆分
    const loader = new EPubLoader(
      EPUB_FILE,
      {
        splitChapters: true
      }
    );
    const documents = await loader.load();
    console.log(`✓ 加载完成，共 ${documents.length} 个章节\n`);

    // 2. 创建文本分割器
    // 创建文本拆分器，拆分到500个字符
    const textsplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: 50,  // 重叠 50 个字符，保持上下文连贯性
    });


    // 3. 逐章处理（不是等全书处理完再插入）
    let totalInserted = 0; // 告诉用户总共处理了多少条（最终统计）
    // 遍历每个章节，进行二次拆分并立即插入
    for (let chapterIndex = 0; chapterIndex < documents.length; chapterIndex++) {
      const chapter = documents[chapterIndex];
      const chapterContent = chapter.pageContent;

      console.log(`处理第 ${chapterIndex + 1}/${documents.length} 章...`);
      
      // 4. 对章节内容进行二次分割
      // 使用splitter 进行第二次拆分
      const chunks = await textsplitter.splitText(chapterContent);
      console.log(`  拆分为 ${chunks.length} 个片段`);

      if (chunks.length === 0) {
        console.log(`  跳过空章节\n`);
        continue;
      }

      // 5. 立即插入这一章的 chunks（流式处理）
      // 立即生成向量并插入该章节的所有片段
      const insertedCount = await insertChunksBatch(chunks, bookId, chapterIndex + 1); // 告诉用户这一章处理了多少条（实时反馈）
      totalInserted += insertedCount;

      console.log(`  ✓ 已插入 ${insertedCount} 条记录（累计: ${totalInserted}）\n`);
    }

    console.log(`\n总共插入 ${totalInserted} 条记录\n`);
    return totalInserted;

  } catch (error) {
    console.error('加载 EPUB 文件时出错:', error.message);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    console.log('='.repeat(80));
    console.log('电子书处理程序');
    console.log('='.repeat(80));

    // 设置book_id
    const bookId = 1;
    
    // 确保集合存在
    await ensureCollection(bookId);

    // 加载和处理EPUB文件（流式处理，边处理边插入）
    await loadAndProcessEPubStreaming(bookId);

    console.log('='.repeat(80));
    console.log('处理完成！');
    console.log('='.repeat(80));


  } catch (error) {
    console.error('\n错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();


/**
 * 1. 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */