const { OpenAIApi, Configuration } = require("openai");
require("dotenv").config();

async function testAPI() {
  const openAIClient = new OpenAIApi(
    new Configuration({
      apiKey: proces.env.OPENAI_API_KEY,
    })
  );

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
          content:
            "Explain the following JavaScript code:\n\nfunction factorial(n) { if (n < 0) return; if (n < 2) return 1; return n * factorial(n - 1); }",
        },
      ],
    });

    console.log(
      "API Response:",
      chatCompletion.data.choices[0].message.content.trim()
    );
  } catch (error) {
    console.error(
      "Error calling OpenAI API:",
      error.response ? error.response.data : error.message
    );
  }
}

testAPI();
