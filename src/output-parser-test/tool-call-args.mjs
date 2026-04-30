/**
 * terminal执行: node ./src/output-parser-test/tool-call-args.mjs
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
  birth_year: z.number().describe("出生年份"),
  nationality: z.string().describe("国籍"),
  fields: z.array(z.string()).describe("研究领域列表"),
});

const modelWithTool = model.bindTools([
  {
    name: "extract_scientist_info",
    description: "提取和结构化科学家的详细信息",
    schema: scientistSchema, // 只有格式定义，没有函数func
    // func: async (args) => {           // ← 有实际逻辑，有func才会真正调用tool
    //   return await fs.readFile(args.filePath);
    // }
  }
]);

// 调用模型
const response = await modelWithTool.invoke("介绍一下爱因斯坦");

console.log('response.tool_calls:',response.tool_calls)
// 获取结构化结果
const result = response.tool_calls[0].args;

console.log("结构化结果:", JSON.stringify(result, null, 2));
console.log(`\n姓名: ${result.name}`);
console.log(`出生年份: ${result.birth_year}`);
console.log(`国籍: ${result.nationality}`);
console.log(`研究领域: ${result.fields.join(', ')}`);


/**
 * 结构化输出的一种做法：把结构化输出伪装成一个"工具调用"，让模型按照指定的 schema 填充参数
 * 
 * LLM 的思考过程："我看到有一个叫 extract_scientist_info 的工具，它的参数需要包含 name、birth_year、nationality、fields。
 * 用户让我'介绍一下爱因斯坦'，我应该调用这个工具，并把爱因斯坦的信息填进去。"
 * 
 * LLM 输出：
 * {
  tool_calls: [{
    name: "extract_scientist_info",
    args: {
      name: "阿尔伯特·爱因斯坦",
      birth_year: 1879,
      nationality: "德国",
      fields: ["理论物理", "相对论"]
    }
  }]
}
  LLM 以为它会调用这个工具，但实际上没有任何代码会去执行它。

  但 tool_calls 里的 args 已经包含了结构化数据
  这里是 代码手动取出 args 使用


  这种设计是伪工具的解决方案
  工具调用的参数格式天然是结构化的，tool_calls[0].args 直接就是对象
  工具调用是 LLM 原生能力，更稳定
 */