# LangChain Database Connector

This project demonstrates the use of LangChain to interact with a database using natural language queries. It leverages OpenAI's GPT model to generate SQL queries based on user input and executes them securely on a PostgreSQL database.

## Features

- **Natural Language to SQL**: Converts user questions into SQL queries using OpenAI's GPT model.
- **SQL Validation**: Ensures that only safe `SELECT` queries are executed, preventing harmful operations like `INSERT`, `UPDATE`, or `DROP`.
- **IST Timezone Handling**: Automatically uses the current date and time in IST (Indian Standard Time) for date-related queries.
- **Fine-Tuned Query Generation**: The system ensures that only one final SQL query is generated, even if subqueries are required. This is achieved through prompt fine-tuning and post-processing of the LLM's response.
- **Flow Diagram**: A visual representation of the code's functionality is provided in `langchain_js_architecture.png`.
- **JSDoc Documentation**: All functions are documented with JSDoc for better understanding and maintainability.

## Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   DB_HOST=your_database_host
   DB_PORT=your_database_port
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PWD=your_database_password
   ```
4. Run the application:
   ```bash
   node main.js
   ```

## Flow Diagram

Refer to `langchain_js_sequence.png` for a visual representation of the code's workflow.

## Security Features

- **SQL Validation**: Queries are validated to ensure they are safe `SELECT` statements before execution.
- **Error Handling**: Generic error messages are returned to the user, while detailed logs are maintained for debugging.
- **Post-Processing of Queries**: The system extracts and executes only the final query from the LLM's response, ensuring no unintended queries are executed.

## Contribution

Feel free to submit issues or pull requests for improvements or bug fixes.
