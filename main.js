import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SqlDatabase } from "@langchain/classic/sql_db";
import { StringOutputParser  } from "@langchain/core/output_parsers";
import { DataSource } from "typeorm";
import { sanitizeSqlQuery } from "./query-validator.js";
import * as dotenv from "dotenv";

dotenv.config();

async function connectToDatabase() {
  const datasource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PWD,
    synchronize: false,
    logging: true,
    // entities: [],
  });
  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource,
    ignoreTables: ["app_users"],
    sampleRowsInTableInfo: 1,
  });
  return db;
}

function getModelInstance() {
  return new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 1000,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function getSchemaText(db) {
  // get full schema
  const tableInfo = await db.getTableInfo();
  return tableInfo;
}

function generatePromptTemplate() {
  return ChatPromptTemplate.fromTemplate(`You are an expert SQL assistant.
    Given the following SQL database schema and a user question,
    generate the appropriate SQL query to retrieve the required information.
    Database Schema Context: {schema}
    User Question: {question}
    SQL Query:`);
}

function generateOutputFormat() {
   return new StringOutputParser();
}

async function generateLogicalSQLQuery(userQuery) {
  try {
    const model = getModelInstance();
    const db = await connectToDatabase();

    const schemaContext = await getSchemaText(db);

    const prompt = generatePromptTemplate();

    const response = await prompt.pipe(model).pipe(generateOutputFormat()).invoke({
      schema: schemaContext,
      question: userQuery,
    });
    const sanitizedQueryResponse = sanitizeSqlQuery(response);
    return sanitizedQueryResponse;
  } catch (error) {
    console.error("Error querying database:", error);
  }
}

console.log(
  await generateLogicalSQLQuery(
    "Analyze the database schema provided in the context having the CREATE and SELECT queries along with one row of each of the table's. Create a SQL Query that shall be used to delete an entry in the expenses table where the id is 15."
    // "Analyze the database schema provided in the context having the CREATE and SELECT queries along with one row of each of the table's. Create a SQL Query that shall be used to make a new INSERT entry in the expenses table with all the required fields."
    // "Analyze the database schema provided in the context having the CREATE and SELECT queries along with one row of each of the table's. Create a SQL Query that shall be used to UPDATE the amount field in the expenses table to 500 where the id is 10."
    // "Analyze the database schema provided in the context having the CREATE and SELECT queries along with one row of each of the table's. Create a SQL Query that shall be used to get all of the expenses, the query should also include the method and source related tables correlation information to get the expense method and source. Do not create the association with the category table. Also, limit the results to 10 rows only such that most recent expense is at the top."
  )
);
