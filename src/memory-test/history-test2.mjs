/**
 * terminal执行: node ./src/memory-test/history-test2.mjs
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
  const systemMessage = new SystemMessage("你是一个友好的做菜助手，喜欢分享美食和烹饪技巧。");

  console.log("[第一轮对话]");
  const history = new FileSystemChatMessageHistory({
    filePath,
    sessionId
  });

  const userMessage1 =  new HumanMessage("红烧肉怎么做");

  await history.addMessage(userMessage1);

  const messages1 = [systemMessage, ...(await history.getMessages())];
  const response1 =  await model.invoke(messages1);
  await history.addMessage(response1);

  // 第二轮对话（基于历史记录）
  console.log("[第二轮对话 - 基于历史记录]");
  const userMessage2 = new HumanMessage("好吃吗？");
  await history.addMessage(userMessage2);

  const messages2 = [systemMessage, ...(await history.getMessages())];
  const response2 =  await model.invoke(messages2);
  await history.addMessage(response2);

  console.log(`用户: ${userMessage2.content}`);
  console.log(`助手: ${response2.content}\n`);

  // 展示所有历史信息
  console.log("[历史消息记录]");
  const allMessages = await history.getMessages();
  console.log(`共保存了 ${allMessages.length} 条消息：`);
  allMessages.forEach((msg, index) => {
    const type = msg.type;
    const prefix = type === 'human' ? '用户' : '助手';
    console.log(`  ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`);
  });
}

fileHistoryDemo().catch(console.error);

// console.error 本身就是一个函数
// .catch(console.error) === .catch((error) => console.error(error))
// .catch(console.log) === .catch((error) => console.log(error))


// 这两种写法等价：
// promise.catch(myHandler);        // 直接传函数名
// promise.catch((err) => myHandler(err));  // 包一层箭头函数