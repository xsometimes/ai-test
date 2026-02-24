import 'dotenv/config';
// 会自动执行 dotenv 的配置，不需要显式调用 dotenv.config()// 等价于：
// import dotenv from 'dotenv';
// dotenv.config();

import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import fs from 'node:fs/promises';
import { z } from 'zod';

const model = new ChatOpenAI({ 
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0, // 温度，也就是 ai 的创造性，设置为 0，让它严格按照指令来做事情，不要自己发挥
  configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 使用 `tool` 函数创建一个名为 `read_file` 的工具，该工具接受一个 `filePath` 参数，并异步读取指定路径的文件内容。
const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
    return `文件内容:\n${content}`;
  },
  {
    name: 'read_file',
    description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。',
    schema: z.object({  // 用 zod 包来描述，就是传入一个 object，里面的 filePath 是一个 string
      filePath: z.string().describe('要读取的文件路径'),
    }),
  }
);

const tools = [
  readFileTool
];

const modelWithTools = model.bindTools(tools);


// 具体的消息有四种：SystemMessage、HumanMessage、AIMessage、ToolMessage
//   SystemMessage：设置 AI 是谁，可以干什么，有什么能力，以及一些回答、行为的规范等
//   HumanMessage：用户输入的信息
//   AIMessage：AI 的回复信息
//   ToolMessage：调用工具的结果返回
const messages = [
  new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释

可用工具：
- read_file: 读取文件内容（使用此工具来获取文件内容）
`),
  new HumanMessage('请读取 ./src/tools/tool-file-read.mjs 文件内容并解释代码')
];

let response = await modelWithTools.invoke(messages);
// console.log(response);

// 将ai返回的消息也放到msgs数组，即对话记录中
messages.push(response);

while (response.tool_calls && response.tool_calls.length > 0) {
  
  console.log(`\n[检测到 ${response.tool_calls.length} 个工具调用]`);
  
  // 执行所有工具调用
  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find(t => t.name === toolCall.name);
      if (!tool) {
        return `错误: 找不到工具 ${toolCall.name}`;
      }
      
      console.log(`  [执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`);
      try {
        const result = await tool.invoke(toolCall.args);
        return result;
      } catch (error) {
        return `错误: ${error.message}`;
      }
    })
  );
  
  // 将工具结果添加到消息历史
  response.tool_calls.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,  // 用 toolCall 对应的 id 来关联执行结果，也就是告诉大模型，你让我调用的哪个工具，返回的结果是什么
      })
    );
  });
  
  // 再次调用模型，传入工具结果
  response = await modelWithTools.invoke(messages);
}

console.log('\n[最终回复]');
console.log(response.content);




/***
 * tool序列0
 * title： 从 Tool 开始：让大模型自动调工具读文件
 * 
 * terminal 执行：
 * node ./src/tools/tool-file-read.mjs
 */

