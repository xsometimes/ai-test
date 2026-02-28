/**
 * 存放所有的tools
 * 每个 tool 都是 name、description 以及基于 zod 声明的参数格式
 */
import { tool } from'@langchain/core/tools';
import fs from'node:fs/promises';
import path from'node:path';
import { spawn } from'node:child_process';
import { createInterface } from 'node:readline';
import { z } from'zod';


/**
 * 一、读取文件工具
 */
const readFileTool = tool(async({ filePath }) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`[工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
    return `文件内容：\n${content}`;
  } catch (error) {
    console.log(`[工具调用] read_file（${filePath}）- 错误：${error.message} `);
    return `读取文件失败：${error.message}`;
  }
}, {
  name: 'read_file',
  description: '读取指定路径的文件内容',
  schema: z.object({
    filePath: z.string().describe('文件路径'),
  }),
});


/**
 * 二、写入文件工具
 */
const writeFileTool = tool(async ({
  filePath,
  content
}) => {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, {
      recursive: true
    });
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[工具调用] write_file("${filePath}") - 成功写入 ${content.length} 字节`);
    return `文件写入成功：${filePath}`;
  } catch (error) {
    console.log(`[工具调用] write_file("${filePath}") - 错误: ${error.message}`);
    return `写入文件失败：${error.message}`;
  }
}, {
  name: 'write_file',
  description: '向指定路径写入文件内容，自动创建目录',
  schema: z.object({
    filePath: z.string().describe('文件路径'),
    content: z.string().describe('要写入的文件内容'),
  }),
});


/**
 * 三、执行命令工具（带实时输出）
 */
const executeCommandTool = tool(({
  command,
  workingDirectory
}) => {
  const cwd = workingDirectory || process.cwd();

  console.log(`[工具调用] execute_command("${command}") ${workingDirectory ? ` - 工作目录：${workingDirectory}` : ''}`);

  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    let errorMsg = '';
    child.on('error', (error) => {
      errorMsg = error.message;
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[工具调用] execute_command("${command}") -  执行成功`);
        const cwdInfo = workingDirectory ? 
          `\n\n重要提示：命令在目录 "${workingDirectory}" 中执行成功。
            若需要在这个项目目录中继续执行命令，
            请使用 workingDirectory："${workingDirectory}" 参数，
            不要使用 cd 命令。` : '';
        // 工具调用返回结果，额外加了 cwd 的信息，避免之后命令胡乱 cd

        resolve(`命令执行失败，${command}${cwdInfo}`);
      } else {
        console.log(`[工具调用] execute_command("${command}") - 执行失败，退出码：${code}`)
        resolve(`命令执行失败，退出码：${code}${errorMsg ? '\n错误：' + errorMsg : ''}`);
      }
    });
  })
}, {
  name: 'execute_command',
  description: '执行系统命令，支持指定工作目录，实时显示输出',
  schema: z.object({
    command: z.string().describe('要执行的命令'),
    workingDirectory: z.string().optional().describe('工作目录（推荐指定）')
  })
})


/**N
 * 四、列出目录内容工具
 */
const listDirectoryTool = tool(async ({ directoryPath }) => {
  try {
    const files = await fs.readdir(directoryPath);
    console.log(`[工具调用] list_directory("${directoryPath}") - 找到 ${files.length} 个项目`);
    return`目录内容:\n${files.map(f => `- ${f}`).join('\n')}`;
  } catch (error) {
    console.log(`[工具调用] list_directory("${directoryPath}") - 错误:${error.message}`);
    return`列出目录失败: ${error.message}`;
  }
}, {
  name: 'list_directory',
  description: '列出指定目录下的所有文件和文件夹',
  schema: z.object({
    directoryPath: z.string().describe('目录路径'),  
  }),
});

/**
 * 添加专门的询问工具
 */
const confirmActionTool = tool(
  async ({ prompt }) => {
    // 使用 readline 实现终端交互
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      readline.question(`${prompt} (y/N): `, (answer) => {
        readline.close();
        const confirmed = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
        resolve(confirmed ? '用户确认继续' : '用户取消操作');
      });
    });
  },
  {
    name: 'confirm_action',
    description: '向用户确认是否继续执行操作，返回用户的确认结果',
    schema: z.object({
      prompt: z.string().describe('向用户显示的确认信息'),
    }),
  }
);


export {
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool,
  confirmActionTool
};
