import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as dotenv from "dotenv";

dotenv.config();

function getPromptTemplate() {
  return ChatPromptTemplate.fromTemplate(
    `Extract Information about a person based on the following input:
    Formatting Instructions: {format_instructions}
    Input: {about_person}`,
  );

}

function getOutputParser() {
  return StructuredOutputParser.fromNamesAndDescriptions({
    name: "name of the person",
    age: "age of the person",
    country: "country in which the person lives",
  });

}

function getModelInstance() {
  return new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 0,
    maxTokens: 1000,
    apiKey: process.env.OPENAI_API_KEY,
  });

}

function generateChain() {
  const promptTemplate = getPromptTemplate();
  const outputParser = getOutputParser();
  const chain = promptTemplate.pipe(getModelInstance()).pipe(outputParser);
  return chain;
}

async function callChain(about_person) {
  const chain = generateChain();
  const response = await chain.invoke({ about_person, format_instructions: chain.steps[2].getFormatInstructions() });
  return response;
}

console.log("GPT Response:", await callChain(`Pranjal is a software developer focused on building clean, scalable, and user-centric web applications. He works primarily with JavaScript, React, Node.js, and modern backend architectures, with a growing specialization in GraphQL authentication and authorization. Aged 30. He an Indian Origin Personnel. He has hands-on experience delivering real-world products, including KharchaVista, an expense management application with an emphasis on usability and performance. Pranjal is committed to continuous learning, strong engineering fundamentals, and writing maintainable, production-ready code.`));
