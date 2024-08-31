const { OpenAIApi, Configuration } = require("openai");
const Parser = require("tree-sitter");
const JavaScript = require("tree-sitter-javascript");
const path = require('path');  // Import the path module

require("dotenv").config();
const fs = require('fs');
const readline = require('readline');

const openAIClient = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

const parser = new Parser();
parser.setLanguage(JavaScript);

async function explainCode(code) {
  try {
    const chatCompletion = await openAIClient.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: `Explain the following JavaScript code:\n\n${code}`,
        },
      ],
    });
    return chatCompletion.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error calling OpenAI API:", error.response ? error.response.data : error.message);
    throw new Error("Failed to get explanation from OpenAI API");
  }
}

async function generateAstJson(code) {
  try {
    const chatCompletion = await openAIClient.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: `Please generate an Abstract Syntax Tree (AST) in JSON format for the following JavaScript code. Ensure the JSON follows this structure:
          - Each node should have:
            - A "type" field (e.g., "FunctionDeclaration", "Identifier").
            - A "children" field that contains an array of child nodes (or an empty array if there are no children).
            - A "text" field that holds the text or name of the node if applicable, otherwise leave it as an empty string.
          Also in your response only return the json, don't say any other word! just return the json!
          Here is the JavaScript code:\n\n${code}`,
        },
      ],
    });

    let responseText = chatCompletion.data.choices[0].message.content.trim();

    // Clean the response by removing any non-JSON text or characters
    if (responseText.startsWith("```json")) {
      responseText = responseText.slice(7);  // Remove the opening ```json
    }
    if (responseText.endsWith("```")) {
      responseText = responseText.slice(0, -3);  // Remove the closing ```
    }

    // Further clean the JSON if necessary
    console.log("GPT JSON:\n", responseText);

    let parsedJson;
    // Validate if the cleaned response is proper JSON
    try {
      parsedJson = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("JSON Parsing Error:", jsonError.message);
      throw new Error("Failed to parse GPT-3.5 AST JSON");
    }

    // Save the GPT-3.5 AST JSON

    const outputPath = path.join(__dirname, '..', '..', 'ast-trees', 'gpt-ast.json');
    fs.writeFileSync(outputPath, JSON.stringify(parsedJson, null, 2));
    console.log(`GPT-3.5 AST JSON saved to ${outputPath}`);

    return parsedJson;
  } catch (error) {
    console.error("Error calling OpenAI API:", error.response ? error.response.data : error.message);
    throw new Error("Failed to get AST JSON from OpenAI API");
  }
}


function nodeToJson(node) {
  const children = [];
  for (let i = 0; i < node.childCount; i++) {
    children.push(nodeToJson(node.child(i)));
  }

  return {
    type: node.type,
    text: node.text,
    children: children.length > 0 ? children : undefined,
  };
}

function generateAst(code) {
  const tree = parser.parse(code);
  const ast = nodeToJson(tree.rootNode);
  // Save the Tree-sitter AST JSON
  const outputPath = path.join(__dirname, '..', '..', 'ast-trees', 'tree-sitter-ast.json');
  fs.writeFileSync(outputPath, JSON.stringify(ast, null, 2));
  console.log(`GPT-3.5 AST JSON saved to ${outputPath}`);

  return nodeToJson(tree.rootNode);
}

function normalizeAst(ast) {
  return {
    type: ast.type,
    children: ast.body || ast.children || [],
  };
}

async function getCodeSamples() {
  const datasetPath = './src/datasets/small_train.jsonl';
  const samples = [];

  const fileStream = fs.createReadStream(datasetPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      let entry = JSON.parse(line);

      if (isNaN(entry.stars_count)) {
        entry.stars_count = 0;
      }
      if (isNaN(entry.forks_count)) {
        entry.forks_count = 0;
      }

      samples.push({ identifier: entry.identifier, code: entry.code });
    } catch (error) {
      console.error('Error parsing JSON line:', error.message);
      console.error('Problematic line:', line);
    }
  }

  console.log("Code samples fetched:", samples);
  return samples;
}

function normalizeGptAst(gptAst) {
  // Check if gptAst already has a structure we expect (e.g., it has a 'type' and 'body' or 'children')
  if (!gptAst || typeof gptAst !== 'object') {
    console.error("Invalid GPT-3.5 AST structure:", gptAst);
    return null;
  }

  // Assume that if a node has a `body` property, it's an array of child nodes.
  if (gptAst.body && Array.isArray(gptAst.body)) {
    return {
      type: gptAst.type,
      children: gptAst.body.map(normalizeGptAst)  // Recursively normalize children
    };
  }

  // If the node has a `children` property instead of `body`, we normalize the same way.
  if (gptAst.children && Array.isArray(gptAst.children)) {
    return {
      type: gptAst.type,
      children: gptAst.children.map(normalizeGptAst)
    };
  }

  // If it's a leaf node (no children/body), return it as is.
  return {
    type: gptAst.type,
    text: gptAst.text || "",  // If there's some text or value associated with the node, keep it
    children: []
  };
}

module.exports = {
  explainCode,
  generateAst,
  generateAstJson,
  normalizeAst,
  getCodeSamples,
  normalizeGptAst,
};
