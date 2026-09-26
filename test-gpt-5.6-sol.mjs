import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/v1`,
});

const response = await client.responses.create({
    model: "gpt-5.6-sol",
    input: "Respond with exactly: GPT-5.6-SOL deployment is operational.",
});

console.log(response.output_text);