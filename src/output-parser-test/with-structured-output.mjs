/**
 * terminal执行: node ./src/output-parser-test/with-structured-output.mjs
 */

import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const model = new ChatOpenAI({
    modelName: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

// 定义结构化输出的 schema
const scientistSchema = z.object({
  name: z.string().describe("科学家的全名"),
  birth_year: z.number().optional().describe("出生年份"), // 允许字段缺失
  nationality: z.string().optional().describe("国籍"),
  fields: z.array(z.string()).optional().describe("研究领域列表"),
});

// 使用 withStructuredOutput 方法
const structuredModel = model.withStructuredOutput(scientistSchema
  // ,{
  //   method: "functionCalling"  // 或 "tool_calling"
  // }
);

// 调用模型
const result = await structuredModel.invoke("介绍一下爱因斯坦，回答用json的格式输出");

console.log("结构化结果:", JSON.stringify(result, null, 2));
console.log(`\n姓名: ${result.name}`);
console.log(`出生年份: ${result.birth_year}`);
console.log(`国籍: ${result.nationality}`);
console.log(`研究领域: ${result.fields && Array.isArray(result.fields) && result.fields.length ? result.fields.join(', ') : 'null'}`);

/**
 * 报错：'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'.",
 * 
 * 解决方式1
 * OpenAI 的 response_format: { type: "json_object" } 有一个安全机制
 * 为了防止模型在不适合的场景下强制输出 JSON，API 要求用户的输入消息中必须包含 "json" 这个关键词，才能启用 json_object 模式。
 * 一个显式的用户确认机制，确保开发者是故意要使用 JSON 输出的。
 * 比如：await structuredModel.invoke("请用 JSON 格式介绍一下爱因斯坦")
 * 
 * 
 * 解决方式2
 * 使用 withStructuredOutput 但指定方法
 * method: "functionCalling"  // 或 "tool_calling" 强制使用工具调用方式
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */