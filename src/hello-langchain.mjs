import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';

dotenv.config();

const model = new ChatOpenAI({ 
    modelName: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

const response = await model.invoke("介绍下自己");
console.log(JSON.stringify(response));


/**
 * 
 * langchain 就是封装了和大模型对话这个过程，加上了 tool、memory、RAG、prompt template 等可以编程
 * 
 * 明确一个概念，
 * LLM大模型本身并不调用工具，
 * 它做的事情永远是通过纯文本回答用户的问题。
 * 其他的MCP/SKILLS/TOOLS都是上层的封装。
 * 比如文章中调用工具的流程实际上是langChain做了一层封装。
 * 没有langChain我们也可以手动通过prompt来告诉大模型我有哪些工具可以用，参数是怎么样，然后让它按照规范的格式返回要调用的工具及其参数
 */