/**
 * terminal执行: node ./src/memory-test/history-test3.mjs
 */
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { FileSystemChatMessageHistory } from '@langchain/community/stores/message/file_system';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import path from 'node:path';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

async function fileHistoryDemo() {
  // 指定存储文件的路径
  const filePath = path.join(process.cwd(), "chat_history.json"); // Current Working Directory（当前工作目录）=执行 node 命令时所在的目录
  const sessionId = "user_session_001";

  // 系统提示词
  const systemMessage = new SystemMessage("你是一个友好、幽默的做菜助手，喜欢分享美食和烹饪技巧。");

  console.log("[第一轮对话]");
  const restoredhistory = new FileSystemChatMessageHistory({
    filePath,
    sessionId
  });

  const restoredMessages = await restoredhistory.getMessages();
  console.log(`从文件恢复了 ${restoredMessages.length} 条历史消息：`);

  restoredMessages.forEach((msg, index) => {
    const type = msg.type;
    const prefix = type === 'human' ? '用户' : '助手';
    console.log(`  ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`);
  });

  console.log("[第三轮对话]");



  const userMessage3 =  new HumanMessage("需要哪些食材？");

  await restoredhistory.addMessage(userMessage3);

  const messages3 = [systemMessage, ...(await restoredhistory.getMessages())];
  const response3 =  await model.invoke(messages3);
  await restoredhistory.addMessage(response3);

  console.log(`用户: ${userMessage3.content}`);
  console.log(`助手: ${response3.content}\n`);
  console.log(`✓ 对话已保存到文件\n`);
}

fileHistoryDemo().catch(console.error);


/**
 * 继续test2，从json文件中取出历史对话，继续对话
 */