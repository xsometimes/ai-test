import { getEncoding, getEncodingNameForModel } from 'js-tiktoken';



/**
 * 字符和 token 数量并没有一个确定的关系，与不同模型的分词器有关。
 * 按照字符数来计算 chunk size 就没法准确估算 token 大小。
 * 对于需要精准控制 token 数量的场景就不大合适了。
 * 用 TokenTextSplitter，它是按照 token 数来分割的
 */
const modelName = 'gpt-4';
// 根据模型名称，返回该模型使用的编码器名称。不同的 OpenAI 模型使用不同的分词器（tokenizer）
const encodingName = getEncodingNameForModel(modelName);
console.log(encodingName);

// 根据编码器名称，加载并返回一个编码器实例
const enc = getEncoding(encodingName);

// 将文本转换成 token 数组，返回的是 token ID 列表。
// 数组的长度就是这段文本在该模型下的 token 数量。
console.log('apple', enc.encode("apple"));
console.log('apple', enc.encode("apple").length);
console.log('pineapple', enc.encode("pineapple"));
console.log('pineapple', enc.encode("pineapple").length);
console.log('苹果', enc.encode("苹果").length);
console.log('吃饭', enc.encode("吃饭").length);
console.log('一二三', enc.encode("一二三").length);



/**
 * terminal：执行 node ./src/rags/tiktoken-test.mjs
 */

