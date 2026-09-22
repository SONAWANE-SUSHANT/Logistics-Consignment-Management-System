require('dotenv').config();

const { StateGraph, MessagesAnnotation, END, START } = require('@langchain/langgraph');
const { ToolNode, toolsCondition } = require('@langchain/langgraph/prebuilt');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { SystemMessage, HumanMessage, AIMessage } = require('@langchain/core/messages');

const {
  getBillingSummaryTool,
  getPartiallyPaidBillsTool,
  getUnpaidBillsTool,
  getPaidBillsTool,
} = require('../ai/tools/billingTools');

/*
|--------------------------------------------------------------------------
| System Prompt
|--------------------------------------------------------------------------
*/

const SYSTEM_PROMPT = `
You are an AI billing assistant inside an internal admin panel
for a logistics company.

Your job is to answer questions about freight bills and payments.

You have access to tools that retrieve REAL information from
the company's PostgreSQL database.

IMPORTANT DATA RULES:

1. Always use the appropriate billing tools when the user asks
   about billing data.

2. Never guess or invent numbers, bills, customers, payment
   amounts, dates, or statuses.

3. All billing data must come from the provided tools.

4. Amounts are in Indian Rupees (INR).

5. Format amounts naturally using the ₹ symbol.
   Example: ₹42,500.

6. You may use multiple tools when the question requires
   information from multiple sources.

7. If the user asks something unrelated to billing, explain
   that you can only help with billing data.


OUTPUT FORMAT:

8. Keep responses clean, professional, and easy to scan.

9. Do NOT use excessive Markdown formatting.

10. Do NOT use **bold** formatting.

11. Do NOT use *italic* formatting.

12. Do NOT use headings with #, ##, ###, etc.

13. Use simple numbered lists or bullet points when listing
    multiple bills.

14. For each bill, use this format:

    1. Bill Number: 26-27/001
       Customer: Endurance Technologies Ltd.
       Total: ₹5,58,227
       Paid: ₹65,554
       Pending: ₹4,92,673
       Status: Partially Paid

15. Put each field on its own line.

16. Leave one blank line between different bills.

17. After a list, provide a short Summary section.

18. The Summary should contain only the important totals.

19. Do not repeat the same information unnecessarily.

20. Keep the response concise unless the user asks for
    detailed information.

21. If there are no matching bills, clearly say:
    "No matching bills were found."

22. Do not add unrelated billing categories unless they are
    useful for answering the user's question or were explicitly
    requested by the user.
`;

/*
|--------------------------------------------------------------------------
| LangGraph StateGraph Definition
|--------------------------------------------------------------------------
*/

const tools = [
  getBillingSummaryTool,
  getPartiallyPaidBillsTool,
  getUnpaidBillsTool,
  getPaidBillsTool,
];

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-3.6-flash',
  apiKey: process.env.GEMINI_API_KEY,
}).bindTools(tools);

const callModel = async (state) => {
  const messages = [new SystemMessage(SYSTEM_PROMPT), ...state.messages];
  const response = await llm.invoke(messages);
  return { messages: [response] };
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode('agent', callModel)
  .addNode('tools', new ToolNode(tools))
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', toolsCondition) // routes to 'tools' or END
  .addEdge('tools', 'agent')
  .compile();

/*
|--------------------------------------------------------------------------
| Assistant Interface
|--------------------------------------------------------------------------
*/

const toGeminiHistory = (history) =>
  history.map((t) => (t.role === 'assistant' ? new AIMessage(t.content) : new HumanMessage(t.content)));

const askBillingAssistant = async (message, history = []) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const result = await graph.invoke(
    {
      messages: [...toGeminiHistory(history), new HumanMessage(message)],
    },
    { recursionLimit: 10 }
  );

  const last = result.messages[result.messages.length - 1];
  const toolsUsed = result.messages
    .filter((m) => m.tool_calls?.length)
    .flatMap((m) => m.tool_calls.map((c) => c.name));

  return {
    reply: typeof last.content === 'string' ? last.content : JSON.stringify(last.content),
    toolsUsed,
  };
};

module.exports = {
  graph,
  askBillingAssistant,
};