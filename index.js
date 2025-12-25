import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Create and return a configured ChatOpenAI model instance.
 *
 * Uses the environment variable `OPENAI_API_KEY` and sets a deterministic
 * configuration suitable for question answering:
 * - model: "gpt-3.5-turbo"
 * - temperature: 0
 * - maxTokens: 1000
 *
 * @returns {ChatOpenAI} Initialized ChatOpenAI instance
 */
function getModelInstance() {
  return new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 1000,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Build the prompt template used to instruct the LLM how to use the
 * provided documents when answering a question.
 *
 * Template variables:
 * - `context`: formatted documents (injected by the combine-documents chain)
 * - `question`: the user's question
 *
 * @returns {ChatPromptTemplate} Prompt template ready to be used with the LLM
 */
function generatePromptTemplate() {
  return ChatPromptTemplate.fromTemplate(`Answer the user's question based on the context below.
    Context: {context}
    Question: {question}
    Answer:`);
}

/**
 * Create and return a "stuff" documents chain runnable.
 *
 * This builds the LLM and prompt, then calls `createStuffDocumentsChain` to
 * obtain a runnable that expects a `{ context }` input (the formatted
 * documents). The function returns a Promise resolving to the runnable.
 *
 * @returns {Promise<any>} Promise resolving to the documents runnable
 */
async function generateDocumentChain() {
  const model = getModelInstance();
  const prompt = generatePromptTemplate();
  return await createStuffDocumentsChain({
    llm: model,
    prompt,
  });
}

/**
 * Load a web page and split it into document chunks for downstream processing.
 *
 * Steps:
 * 1. Load HTML and extract text using `CheerioWebBaseLoader`.
 * 2. Split the resulting documents into smaller chunks using
 *    `RecursiveCharacterTextSplitter` with `chunkSize=100` and `chunkOverlap=20`.
 *
 * @returns {Promise<Array>} Array of document chunks suitable for ingestion
 */
async function loadWebPageGenerateDocuments() {
  const loader = new CheerioWebBaseLoader(
    "https://cobusgreyling.medium.com/what-is-langchain-expression-language-lcel-8a828c38b37d"
  );
  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 100,
    chunkOverlap: 20,
  });
  return await splitter.splitDocuments(docs);
}

/**
 * Main orchestration function.
 *
 * Workflow:
 * - Load and split documents from the configured web page
 * - Create the documents chain runnable
 * - Query the chain with a question and print the response
 *
 * @returns {Promise<void>}
 */
async function main() {
  const docs = await loadWebPageGenerateDocuments();
  const documentChain = await generateDocumentChain();
  const question = "What is LCEL?";
  const response = await documentChain.invoke({
    question,
    context: docs,
  });
  console.log("Response:", response);
}

await main();
