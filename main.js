import { Pool } from "pg";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { encode } from '@toon-format/toon';
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Create and return a PostgreSQL connection pool using environment variables.
 * The function will create a `pg.Pool` instance and perform a simple test
 * query (`SELECT 1`) to validate connectivity before returning the pool.
 *
 * @returns {Promise<import('pg').Pool>} Connected PostgreSQL pool
 */
async function createDBConnection() {
  const pool = new Pool({
    host: process.env.PGHOST || process.env.DB_HOST || "localhost",
    port: parseInt(process.env.PGPORT || process.env.DB_PORT || "5432", 10),
    user: process.env.PGUSER || process.env.DB_USER,
    password: process.env.PGPASSWORD || process.env.DB_PWD,
    database: process.env.PGDATABASE || process.env.DB_NAME,
    max: parseInt(process.env.PGPOOL_MAX || "10", 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || "30000", 10),
    ssl:
      process.env.PGSSLMODE === "require" || process.env.PG_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  // Verify connection by running a simple query
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    // If validation fails, clean up and rethrow for the caller to handle
    await pool.end().catch(() => {});
    throw err;
  }

  return pool;
}

async function getExpenses() {
  let connPool = await createDBConnection();
  const allExpenses = await connPool.query(`
        SELECT expenses.amount, expenses.description, expenses.date AS expense_date, expenses.is_repayed, expenses.tag, 
        payment_sources.name AS source_name, 
        payment_methods.name AS method_name 
        FROM expenses 
        LEFT JOIN payment_sources ON expenses.source_id = payment_sources.id
        LEFT JOIN payment_methods ON expenses.method_id = payment_methods.id 
        WHERE expenses.is_deleted = 0 ORDER BY expenses.date DESC LIMIT 200;`);

  console.log("\nallExpenses length:\n", allExpenses.rows.length);
  await connPool.end();
  return allExpenses.rows;
}

function createModelInstance() {
  return new ChatOpenAI({
    model: "gpt-4.1",
    temperature: 0.7,
    maxTokens: 10000,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function createPromptTemplate() {
  return ChatPromptTemplate.fromTemplate(`Answer the user's question based on the context below.
    Context: {context}
    Question: {question}
    Answer Formatting Instructions: {format_instructions}`);
}

function generateOutputParser() {
    return StructuredOutputParser.fromNamesAndDescriptions({
        total_amount: "Total amount of all expenses in INR",
        highest_expense: "Highest expense details from the context",
        lowest_expense: "Lowest expense details from the context",
        count: "Number of expenses objects used from context to calculate the sum"
    });
}

async function main() {
  const expenses = await getExpenses();
  const model = createModelInstance();
  const prompt = createPromptTemplate();

  const chain = prompt.pipe(model).pipe(generateOutputParser());
  const toonedExpenses = encode({ expenses });
  const AIResponse = await chain.invoke({
    context: toonedExpenses,
    question: "What is the total amount of all of the expenses provided in the context in the month of november i.e. 11th month of this year? Use INR symbol.",
    format_instructions: generateOutputParser().getFormatInstructions(),
  });
  console.log("Retrieved AI response:", AIResponse);
}

await main();
