const express = require("express");
const { explainCode, generateAst, generateAstJson, normalizeAst, getCodeSamples, normalizeGptAst } = require("./services/codeService");
const router = express.Router();

router.post("/process", async (req, res) => {
  const { code } = req.body;
  console.log("Received code:", code);
  try {
    const explanation = await explainCode(code);
    const treeSitterAst = generateAst(code);

    const normalizedTreeSitterAst = normalizeAst(treeSitterAst);

    console.log("Generated explanation:", explanation);
    console.log("Tree-sitter AST:", normalizedTreeSitterAst);

    res.json({
      explanation,
      treeSitterAst: normalizedTreeSitterAst
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/codesamples', async (req, res) => {
  try {
    const samples = await getCodeSamples();
    console.log("Fetched code samples:", samples);
    res.json(samples);
  } catch (error) {
    console.error("Error fetching code samples:", error);
    res.status(500).json({ error: 'Failed to fetch code samples' });
  }
});

router.post("/generate-gpt-ast", async (req, res) => {
  const { code } = req.body;
  try {
    const gptAstJson = await generateAstJson(code);
    const normalizedGptAst = normalizeGptAst(gptAstJson);

    console.log("GPT-3.5 AST:", normalizedGptAst);

    res.json({ gptAst: normalizedGptAst });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(400).json({ error: error.message });
  }
});



module.exports = router;
