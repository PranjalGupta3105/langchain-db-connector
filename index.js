import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";

dotenv.config();

const modelInstance = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0,   
  maxTokens: 1000,
  apiKey: process.env.OPENAI_API_KEY,
});


const aiResponse = await modelInstance.invoke("What is langchain? How can I use it to connect to a database?");
console.log("GPT Response:", aiResponse);