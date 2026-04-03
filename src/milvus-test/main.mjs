/**
 * terminal执行: node ./src/milvus-test/main.mjs 
 */


import "dotenv/config";
import { MilvusClient, DataType, MetricType, IndexType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from '@langchain/openai';

const COLLECTION_NAME = 'ai_diary';
const VECTOR_DIM = 1024;

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  // 插入数据，也要把嵌入模型指定为 1024 的维度
  dimensions: VECTOR_DIM
});

const client = new MilvusClient({
  address: process.env.MILVUS_HOST,
  port: process.env.MILVUS_PORT,
  username: process.env.MILVUS_USERNAME,
  token: process.env.MILVUS_TOKEN,
  // password: process.env.MILVUS_PASSWORD,
});

async function getEmbedding(text) {
  const result = await embeddings.embedQuery(text);
  return result;
}

async function main() {
  try {
    console.log('Connecting to Milvus...');
    console.log('✓ Connected\n');

    // 创建集合
    console.log('Creating collection...');
    await client.createCollection({
      collection_name: COLLECTION_NAME,
      // 这就是 schema，创建 collection 集合的时候需要指定。
      // 和 mysql 的表差不多，唯一的区别是 vector 这个字段，我们设置了 FloatVector 类型，也就是向量，指定维度是 1024 维。
      fields: [
        { name: 'id', data_type: DataType.VarChar, max_length: 50, is_primary_key: true },
        { name: 'vector', data_type: DataType.FloatVector, dim: VECTOR_DIM },
        { name: 'content', data_type: DataType.VarChar, max_length: 5000 },
        { name: 'date', data_type: DataType.VarChar, max_length: 50 },
        { name: 'mood', data_type: DataType.VarChar, max_length: 50 },
        { name: 'tags', data_type: DataType.Array, element_type: DataType.VarChar, max_capacity: 10, max_length: 50 },
      ]
    });
    console.log('✓ Collection created\n');

    // 创建索引
    // 向量字段需要建立索引，metric_type 指定用余弦相似度作为距离度量
    console.log('Creating index...');
    await client.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: 'vector',
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: {
        nlist: 1024,
      },
    });
    console.log('✓ Index created\n');

    // 加载集合
    console.log('Loading collection...');
    await client.loadCollection({
      collection_name: COLLECTION_NAME,
    });
    console.log('✓ Collection loaded\n');

    // 插入日记数据
    console.log('Inserting diary entries...');
    const diaryContents = [
      {
        id: 'diary_001',
        content: '今天天气很好，我去了公园散步。',
        date: '2026-03-31',
        mood: '开心',
        tags: ['散步', '公园', '天气好'],
      },
      {
        id: 'diary_002',
        content: '今天工作很忙，完成了一个重要的项目里程碑。团队合作很愉快，感觉很有成就感。',
        date: '2026-01-11',
        mood: 'excited',
        tags: ['工作', '成就']
      },
      {
        id: 'diary_003',
        content: '周末和朋友去爬山，天气很好，心情也很放松。享受大自然的感觉真好。',
        date: '2026-01-12',
        mood: 'relaxed',
        tags: ['户外', '朋友']
      },
      {
        id: 'diary_004',
        content: '今天学习了 Milvus 向量数据库，感觉很有意思。向量搜索技术真的很强大。',
        date: '2026-01-12',
        mood: 'curious',
        tags: ['学习', '技术']
      },
      {
        id: 'diary_005',
        content: '晚上做了一顿丰盛的晚餐，尝试了新菜谱。家人都说很好吃，很有成就感。',
        date: '2026-01-13',
        mood: 'proud',
        tags: ['美食', '家庭']
      },
    ];
    console.log('Generating embeddings...');
    const diaryData = await Promise.all(diaryContents.map(async (diary) => ({
      ...diary,
      vector: await getEmbedding(diary.content),
    })));

    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: diaryData,
    });
    console.log('✓ inserted ${insertResult.inserted_cnt} records\n');
    


  } catch (error) {
    console.error('Error:', error.message);
  }
}

// 把query向量化，做余弦相似度的检索
const query = '我想看看关于晚餐的日记';
console.log(`query: ${query}\n`);
const queryVector = await getEmbedding(query);
const searchResult = await client.search({
  collection_name: COLLECTION_NAME,
  vector: queryVector,
  limit: 2,
  metric_type: MetricType.COSINE,
  output_fields: ['id', 'content', 'date', 'mood', 'tags'],
}).then(res => {
  console.log('搜索结果:',res.length);
  res && res.results && res.results.length && res.results.forEach(item => {
    console.log(`ID: ${item.id}`);
    console.log(`Content: ${item.content}`);
    console.log(`Date: ${item.date}`);
    console.log(`Mood: ${item.mood}`);
    console.log(`Tags: ${item.tags.join(', ')}`);
  });
});

main();