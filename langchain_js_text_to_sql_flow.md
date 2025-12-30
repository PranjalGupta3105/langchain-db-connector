
# LangChain JS Text-to-SQL System – Flow Diagram

```mermaid
flowchart TD
    A[User enters question via CLI] --> B[main()]
    B --> C[Initialize LLM - ChatOpenAI]
    B --> D[Generate SQL Prompt Template]
    B --> E[Initialize Output Parser]
    B --> F[Setup Database Connection]
    F --> G[Scan DB Schema & Sample Rows]

    G --> H[Get Current IST Date & Year]
    H --> I[Build Prompt Context]
    I --> J[LLM Generates SQL Query]

    J --> K{Is SQL Safe SELECT?}
    K -- No --> L[Reject Query & Return Error]
    K -- Yes --> M[Execute SQL on Database]

    M --> N[Fetch Query Result]
    N --> O[LLM Explains Result]
    O --> P[Final Answer Returned to User]
```
