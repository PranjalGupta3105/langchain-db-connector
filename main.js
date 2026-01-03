import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { SqlDatabase } from "@langchain/classic/sql_db";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import * as readline from "readline/promises";
import { encode } from '@toon-format/toon';

dotenv.config();

/*
 * Scan the database schema and sample data to understand its structure using LLM. [SCAN]
 * Pick and choose appropriate tables, the associated tables and then Generate the appropriate query as per the understanding of the user's question. [GENERATE]
 * Execute on the database and return the results to the user as final answer for the prompt. [EXECUTE]
 */

/**
 * Creates and returns an instance of the ChatOpenAI model.
 * @returns {ChatOpenAI} An instance of the ChatOpenAI model.
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
 * Generates a prompt template for the ChatOpenAI model.
 * @returns {ChatPromptTemplate} A prompt template for generating SQL queries.
 */
function generatePromptTemplate() {
  return ChatPromptTemplate.fromTemplate(`
    You are an expert database administrator and SQL developer. On the basis of the database schema and sample data provided in context, you need to generate the correct SQL query and execute the same to get the answer to the user's question. Keep the following instructions in mind while generating the SQL query:
      - If the user's question is not related to the database schema provided, politely inform them that you are only able to answer questions related to the source database.
      - You should only generate a SELECT query. DO NOT generate any other query like INSERT, UPDATE or DELETE. Politely refuse if the user asks for such queries.
      - Never query any tables other than those mentioned in the context.
      - Always ensure that the SQL query you generate is syntactically correct, safe, efficient and does not cause any harm.
      - Use appropriate filtering, joins, aggregations, group by and order by clauses as per the user's question.
      - Always use single quotes for string literals in SQL queries.
      - Use 'ILIKE' operator for case insensitive matching while querying.
      - DO NOT use LIMIT clause in the SQL query, unless specifically asked by the user to limit the data.
      - Do not consume and apply unnecessary tables in JOINs with the primary table.
      - Use default Ordering as DESC while fetching data, unless specifically asked by the user to order in ASC order.
      - Generate only one SQL Query that's final and complete. If you believe that the SQL Query requires sub-query usage, then the final answer should not provide both the subquery and sql query separately, just one final query. Use exact column names as per the schema provided in context.
      - Provide only the final answer to the user's question without any additional commentary.
    Current date/time (IST): {current_date_ist}
    Current year (IST): {current_year}
    Context: {context}
    User's Question: {question}
    If the user's question has any date, day, month, year or time related ask, ensure that you use the provided Current year (IST) and Current date/time (IST) while framing the sql query. DO NOT simply use the one as per the sample data from the sql server.
    However, if the question is ambiguous, ask the user for clarification.
    Answer:`);
}

/**
 * Creates and returns a StringOutputParser instance.
 * @returns {StringOutputParser} An instance of the StringOutputParser.
 */
function parseOutput() {
  return new StringOutputParser();
}

/**
 * Calculates the current date and time in IST (Indian Standard Time).
 * @returns {{ istString: string, year: number }} An object containing the IST date/time string and the current year.
 */
function getCurrentIST() {
  const now = new Date();
  // convert local time to UTC, then add IST offset (UTC+5:30)
  const nowUtc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // 5.5 hours
  const istDate = new Date(nowUtc.getTime() + istOffsetMs);
  const istString =
    istDate.toISOString().replace("T", " ").slice(0, 19) + " IST";
  const year = istDate.getFullYear();
  return { istString, year };
}

/**
 * Sets up and returns a database source using TypeORM.
 * @async
 * @returns {Promise<SqlDatabase>} A configured SqlDatabase instance.
 */
async function setUpDatabaseSource() {
  const datasource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PWD,
    synchronize: false,
    logging: true,
  });
  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource,
    ignoreTables: ["app_users"],
    sampleRowsInTableInfo: 2,
  });
  return db;
}

/**
 * Retrieves the schema information of the database.
 * @async
 * @param {SqlDatabase} dbInstance - The database instance.
 * @returns {Promise<Object>} The schema information of the database.
 */
async function getSchema(dbInstance) {
  return await dbInstance.getTableInfo();
}

/**
 * Creates a RunnableSequence for generating SQL queries.
 * @param {ChatOpenAI} model - The ChatOpenAI model instance.
 * @param {ChatPromptTemplate} prompt - The prompt template for generating SQL queries.
 * @returns {RunnableSequence} A RunnableSequence for generating SQL queries.
 */
function getSQLQuery(model, prompt) {
  return RunnableSequence.from([prompt, model]);
}

/**
 * Executes the query and frames the final answer based on the database query result.
 * @async
 * @param {ChatOpenAI} model - The ChatOpenAI model instance.
 * @param {string} question - The user's question.
 * @param {Object} dbQueryAnswer - The result of the database query.
 * @param {StringOutputParser} parser - The output parser instance.
 * @returns {Promise<string>} The final answer to the user's question.
 */
async function executeQueryAndFrameAnswer(
  model,
  question,
  dbQueryAnswer,
  parser
) {
  const explanationPrompt = `
      User Question:
      ${question}

      SQL Result:
      ${JSON.stringify(dbQueryAnswer)}

      Explain the result clearly and concisely.`;

  return await model.pipe(parser).invoke(explanationPrompt);
}

/**
 * Validates if the given SQL query is a safe SELECT statement.
 * @param {string} sql - The SQL query to validate.
 * @returns {boolean} True if the query is safe, false otherwise.
 */
function isSafeSelect(sql) {
  const sqlString = sql.trim().toLowerCase();

  // Ensure the query starts with SELECT
  if (!sqlString.startsWith("select")) return false;

  // Allow semicolons only at the end of the query
  const semicolonMatch = sqlString.match(/;/g);
  if (semicolonMatch && !sqlString.endsWith(";")) return false;

  // Check for forbidden keywords
  const forbidden =
    /(insert|update|delete|drop|alter|truncate|create|grant|--|\/\*)/;
  return !forbidden.test(sqlString);
}

/**
 * Extracts the final SQL query from a response containing multiple queries.
 * @param {string} sqlResponse - The SQL response string potentially containing multiple queries separated by semicolons.
 * @returns {string} The last SQL query from the response, with a semicolon appended.
 */
function extractFinalQuery(sqlResponse) {
  // Split the response into individual queries using semicolons
  const queries = sqlResponse.split(';').map(query => query.trim()).filter(query => query.length > 0);

  // Return the last query
  return queries[queries.length - 1] + ';';
}

/**
 * Main function to handle the user's question, generate SQL, execute it, and return the answer.
 * @async
 * @param {string} userQuestion - The user's database-related question.
 * @returns {Promise<string>} The final answer to the user's question or an error message.
 */
async function main(userQuestion) {
  try {
    const model = getModelInstance();
    const prompt = generatePromptTemplate();
    const parser = parseOutput();
    const dbInstance = await setUpDatabaseSource();
    const schema = await getSchema(dbInstance);

    const sqlGeneratorChain = getSQLQuery(model, prompt).pipe(parser);

    const { istString, year } = getCurrentIST();

    const sqlResponse = await sqlGeneratorChain.invoke({
      context: schema,
      question: userQuestion,
      current_date_ist: istString,
      current_year: year.toString(),
    });

    const sqlResponseFinal = extractFinalQuery(sqlResponse);

    if (isSafeSelect(sqlResponseFinal)) {
      let dbQueryAnswer = "";
      dbQueryAnswer = await dbInstance.run(sqlResponseFinal);
      
      if (dbQueryAnswer)
        if (
          Array.isArray(JSON.parse(dbQueryAnswer)) &&
          JSON.parse(dbQueryAnswer).length > 1
        ) {
          // Toonifying the context if the number of the rows is more than 1
          dbQueryAnswer = encode({ expenses_data: JSON.parse(dbQueryAnswer) });
        }

      if (!dbQueryAnswer)
        return `Error: Failed to execute SQL query on the database and fetch the results.`;

      const finalAnswer = await executeQueryAndFrameAnswer(
        model,
        userQuestion + "Use INR symbol for denoting the value.",
        dbQueryAnswer,
        parser
      );
      return finalAnswer;
    } else
      return `Error: LLM Generated SQL query is not a safe SELECT statement.`;
  } catch (error) {
    return `Error occurred: Unable to process the request. ${error.message}`;
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const userQuestion = await rl.question(
  "Please enter your database-related question: "
);
const answer = await main(userQuestion);
rl.close();
console.log("Answer: ", answer);
process.exit(0);
