import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// 数据库
const database = {
  users: {
    '001': { id: '001', name: '张三', email: 'zhangsan@example.com', role: 'admin' },
    '002': { id: '002', name: '李四', email: 'lisi@example.com', role: 'user' },
    '003': { id: '003', name: '王五', email: 'wangwu@example.com', role: 'user' },
  }
};

/**
 * 创建了 mcp server 实例
 */
const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});


/**
 * server.registerTool 注册了一个工具，声明 name、description、schema
 */
server.registerTool('query_user', 
  {
    version: '1.0.0',
    description: '查询数据库中的用户信息。输入用户ID，返回该用户的详细信息（姓名、邮箱、角色）。',
    inputSchema: {
      userId: z.string().describe('用户ID， 例如 001、002、003'),
    }, 
  },
  async ({
    userId,
  }) => {
    const user = database.users[userId];
    if (!user) {
      return {
        content: [
          {
            type: 'text',
            text: `用户 ${userId} 不存在`
          }
        ]
      };
    }
    return {
      context: [
        {
          type: 'text',
          text: `用户信息：\n- ID: ${user.id}\n- 姓名: ${user.name}\n- 邮箱: ${user.email}\n- 角色: ${user.role}`,
        }
      ]
    };
  },
);


/**
 * server.registerResource 注册了一个资源，就是静态数据
 * 不是用来作为 tool 触发的，主要是你可以引用用来写 prompt 之类的
 */
server.registerResource('使用指南', 'docs://guide', {
  description: 'MCP Server 使用文档',
  mimeType: 'text/plain',
}, async () => {
  return {
    contents: [
      {
        uri: 'docs://guide',
        mimeType: 'text/plain',
        text: `MCP Server 使用指南

功能：提供用户查询等工具。

使用：在 Cursor 等 MCP Client 中通过自然语言对话，Cursor 会自动调用相应工具。`,
      }
    ]
  }
});

const transport = new StdioServerTransport();

await server.connect(transport);

/**
 * 和我们写 tool 的时候差不多，只不过这里分了 resource 和 tool，
 * resouce 一般返回静态数据，
 * tool 来做一些事情
 */