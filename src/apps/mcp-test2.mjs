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
      command: "node",
      args: [
        "/Users/lydia/Desktop/wp/code/ai-test/src/mcps/my-mcp-server.mjs"
      ]
    },
    // 高德地图
    "amap-maps-streamableHTTP": {
      "url": "https://mcp.amap.com/mcp?key=" + process.env.AMAP_MAPS_API_KEY
    },
    // mcp官方维护的一个
    "filesystem": {
      "command": "npx", // npx -y 会自动下载并执行指定的包，不需要提前安装
      "args": [
        "-y", // -y 参数的作用：跳过确认提示；临时缓存；即用即走
        "@modelcontextprotocol/server-filesystem",
        ...(process.env.ALLOWED_PATHS.split(',') || '') // MCP Roots：这是 MCP 协议的一个特性，允许客户端告诉服务器"哪些目录是项目的根目录"，若不允许，服务器回退使用启动时参数传入的允许目录
      ]
    },

    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest"
      ]
    }
    
  }
});


const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

// 在 OpenAI（和兼容 OpenAI API 的模型）的对话格式中，工具调用的消息序列必须严格遵守：
// 1. UserMessage: "请读取文件"
// 2. AIMessage: (包含 tool_calls)  ← 必须有 tool_calls
// 3. ToolMessage: (包含工具结果)   ← 必须紧跟在上面之后
// 4. AIMessage: "文件内容是..."
async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new HumanMessage(query) // 1. UserMessage: "请读取文件"
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
    const response = await modelWithTools.invoke(messages);
    messages.push(response); // 2. AIMessage: (包含 tool_calls)  ← 必须有 tool_calls

    // 检查工具是否有调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    console.log(chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
    console.log(chalk.bgBlue(`🔍 工具调用: ${response.tool_calls.map(t => t.name).join(', ')}`));

    // 执行工具调用
    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find(t => t.name === toolCall.name); // 模型思考后要调用的工具，在tools中能找到
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args);

        // fileSystem有个坑要注意下，封装的这些 tool 返回的是对象，有 text 属性
        // 此处需要确保 tool返回的content都是字符串类型
          let contentStr;
          if (typeof toolResult === 'string') {
            contentStr = toolResult;
          } else if (toolResult && toolResult.text) {
            // 若返回对象有text字段，优先使用
            contentStr = toolResult.text;
          }

        messages.push(new ToolMessage({ // 3. ToolMessage: (包含工具结果)   ← 必须紧跟在上面之后
          content: contentStr,
          tool_call_id: toolCall.id,
        }));
      }
    }
    
  }

  return messages[messages.length - 1].content;

}

// task 1
await runAgentWithTools('北京南站附近的5个酒店，以及去的路线，路线规划生成文档保存到 /Users/lydia/Desktop/wp/股 的一个 md 文件');

// task 2
// await runAgentWithTools('北京南站附近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名');

await mcpClient.close();

/**
 * mcp client 拿到其中的 tools 绑定给 model
 * 然后调用 model，如果有 tool_calls 就调用下，把工具调用结果封装为 ToolMessage 传给大模型继续处理。
 * 
 * 
 */