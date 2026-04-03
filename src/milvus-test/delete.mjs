import 'dotenv/config';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

const COLLECTION_NAME = 'ai_diary';

const client = new MilvusClient({
  address: process.env.MILVUS_HOST,
  port: process.env.MILVUS_PORT,
  username: process.env.MILVUS_USERNAME,
  token: process.env.MILVUS_TOKEN,
});

async function main() {
  try {
    console.log('Connecting to Milvus...');
    await client.connectPromise;
    console.log('✓ Connected\n');

    // 删除单条数据
    console.log('Deleting diary entry...');
    const deleteId = 'diary_005';

    const result =  await client.delete({
      collection_name: COLLECTION_NAME,
      filter: `id == "${deleteId}"`
    });


    console.log(`✓ Deleted ${result.delete_cnt} record(s)`);
    console.log(`  ID: ${deleteId}\n`);

    // 批量删除
    console.log('Batch deleting diary entries...');
    const deleteIds = ['diary_002', 'diary_003'];
    const idStr = deleteIds.map(id => `"${id}"`).join(', ');

    const batchResult = await client.delete({
      collection_name: COLLECTION_NAME,
      filter: `id in [${idStr}]`,
    });

    console.log(`✓ Batch deleted ${batchResult.delete_cnt} record(s)`);
    console.log(`  IDs: ${deleteIds.join(', ')}\n`);


    // 条件删除
    console.log('Deleting by condition...');
    const conditionResult = await client.delete({
      collection_name: COLLECTION_NAME,
      filter: `nmood == "sad"`
    });

    console.log(`✓ Deleted ${conditionResult.delete_cnt} record(s) with mood="sad"\n`);


  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();