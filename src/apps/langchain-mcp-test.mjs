/**
 * mcp，除了 cursor，别的软件同样可以调用这个服务：
 * terminal执行: node ./src/apps/langchain-mcp-test.mjs
 */


import 'dotenv/config';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: 'qwen-plus',
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'my-mcp-server': {
      command: 'node',
      // args: [path.resolve(__dirname, '../mcps/my-mcp-server.mjs')],
      args: ['/Users/lydia/Desktop/wp/code/ai-test/src/mcps/my-mcp-server.mjs'],
      // /Users/lydia/Desktop/wp/code/ai-test/src/mcps/my-mcp-server.mjs
    },
  }
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

async function  runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new HumanMessage(query),
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));

    const response  = await modelWithTools.invoke(messages);
    messages.push(response);

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    console.log(chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
    console.log(chalk.bgBlue(`🔍 工具调用: ${response.tool_calls.map(t => t.name).join(', ')}`));
    // 执行工具调用
    for (const toolCall of response.tool_calls) {
      const foundTool  = tools.find(t => t.name === toolCall.name);
      if (foundTool) {
        const toolResult =  await foundTool.invoke(toolCall.args);
        messages.push(new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id
        }))
      }
    }
  }

  return messages[messages.length - 1].content;

}


// task1 
await runAgentWithTools('查一下用户 002 的信息');

// task2
const res = await mcpClient.listResources();
// console.log(res);
for (const [serverName, resources] of Object.entries(res)) {
  for (const resourse of resources) {
    const content = await mcpClient.readResource(serverName, resourse.uri);
    // console.log(`${serverName}： ${JSON.stringify(content)} \n`);
    console.log(content);
  }
}




await mcpClient.close(); // 退出子进程
