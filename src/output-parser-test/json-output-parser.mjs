/**
 * terminal执行: node ./src/output-parser-test/json-output-parser.mjs
 */



import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// 初始化模型
const model = new ChatOpenAI({
    modelName: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

const parser = new JsonOutputParser();


// JsonOutputParser 比较简单，不需要提示词
const tip = parser.getFormatInstructions();
console.log('tip', tip);

const question = `请介绍一下爱因斯坦的信息。依据“${tip}”的提示。请以 JSON 格式返回，包含以下字段：name（姓名）、birth_year（出生年份）、nationality（国籍）、major_achievements（主要成就，数组）、famous_theory（著名理论）。

${parser.getFormatInstructions()}`; // getFormatInstructions没提示词，JsonOutputParser 比较简单，不需要提示词

console.log('question:',question)
try {
    console.log("🤔 正在调用大模型（使用 JsonOutputParser）...\n");

    const response = await model.invoke(question);

    console.log("📤 模型原始响应:\n");
    console.log(response.content);

    const result = await parser.parse(response.content); ////////

    console.log("✅ JsonOutputParser 自动解析的结果:\n");
    console.log(result);
    console.log(`姓名: ${result.name}`);
    console.log(`出生年份: ${result.birth_year}`);
    console.log(`国籍: ${result.nationality}`);
    console.log(`著名理论: ${result.famous_theory}`);
    console.log(`主要成就:`, result.major_achievements);

} catch (error) {
    console.error("❌ 错误:", error.message);
}