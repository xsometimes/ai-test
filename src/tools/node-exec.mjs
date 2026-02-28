// spawn 可指定在 cwd 这个目录下执行命令，会创建一个子进程来跑

import { spawn } from 'node:child_process';

const command = 'ls -la';
/**
 * const command = 'echo -e "n\nn" | npm create vite react-todo-app --template react-ts'; // for test
 * 命令echo：在终端（命令行）中用来输出（显示）文字的指令，你给它什么内容，它就在屏幕上显示什么内容
 * 参数-e：启用转义字符解析
 * eg：
 *  echo -e "n\nn" | npm init  或者 echo -e "\n\n\n\n" | some-command
 *  用 echo 模拟用户连续按回车键，实现脚本的自动化应答——每个 \n 就相当于按一次回车。
 */


const cwd = process.cwd(); // 项目根目录

// 解析命令和参数：用空格分割出命令和参数部分，分别作为 cmd、args
const [cmd, ...args] = command.split(' ');
const child = spawn(cmd, args, {
  cwd,
  stdio: 'inherit', // 实时输出到控制台：nherit 就是这个子进程的 stdout 也输出到父进程的 stdout，也就是控制台。
  shell: true, // 默认false，若不需要 shell 特性（如管道、重定向、通配符），直接去掉 shell: true
});

let errorMsg = '';

child.on('error', (error) => {
  errorMsg = error.message;
});

child.on('close', (code) => {
  if (code === 0) {
    process.exit(0);
  } else {
    if (errorMsg) {
      console.error(`错误：${errorMsg}`);
    }
    process.exit(code || 1);
  }
});



