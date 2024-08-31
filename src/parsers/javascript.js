const Parser = require("tree-sitter");
const JavaScript = require("tree-sitter-javascript");

const parser = new Parser();
parser.setLanguage(JavaScript);

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

function generateCfg(node) {
  const nodes = [];
  const links = [];
  let id = 0;

  function traverse(node, parent = null) {
    const currentNode = { id: id++, type: node.type, text: node.text };
    nodes.push(currentNode);

    if (parent) {
      links.push({ source: parent.id, target: currentNode.id });
    }

    for (let i = 0; i < node.childCount; i++) {
      traverse(node.child(i), currentNode);
    }
  }

  traverse(node);
  return { nodes, links };
}

module.exports = {
  parse: (code) => {
    const tree = parser.parse(code);
    return nodeToJson(tree.rootNode);
  },
  generateCfg: (code) => {
    const tree = parser.parse(code);
    return generateCfg(tree.rootNode);
  },
};
