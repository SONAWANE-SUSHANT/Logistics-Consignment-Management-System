const { GoogleGenAI, Type } = require('@google/genai');

const {
  getBillingSummaryTool,
  getPartiallyPaidBillsTool,
  getUnpaidBillsTool,
  getPaidBillsTool,
} = require('../ai/tools/billingTools');


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const MODEL = 'gemini-3.6-flash';

const MAX_TOOL_ITERATIONS = 5;


/*
|--------------------------------------------------------------------------
| Gemini Client
|--------------------------------------------------------------------------
*/

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


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
| Gemini Function Declarations
|--------------------------------------------------------------------------
|
| These describe functions Gemini is allowed to REQUEST.
| Gemini never executes them itself — our backend does, in TOOL_HANDLERS below.
|--------------------------------------------------------------------------
*/

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_billing_summary',
        description:
          'Get overall freight billing statistics including total bills, total billed amount, total paid amount, total pending amount, and counts of paid, unpaid, and partially paid bills.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_partially_paid_bills',
        description:
          'Get freight bills where some payment has been received but the bill is not fully paid (paid amount greater than zero and less than the grand total).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            limit: {
              type: Type.NUMBER,
              description: 'Maximum number of bills to return. Defaults to 100, should not exceed 500.',
            },
          },
        },
      },
      {
        name: 'get_unpaid_bills',
        description: 'Get freight bills where no payment has been recorded yet.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            limit: {
              type: Type.NUMBER,
              description: 'Maximum number of bills to return. Defaults to 100, should not exceed 500.',
            },
          },
        },
      },
      {
        name: 'get_paid_bills',
        description: 'Get freight bills that have been completely paid.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            limit: {
              type: Type.NUMBER,
              description: 'Maximum number of bills to return. Defaults to 100, should not exceed 500.',
            },
          },
        },
      },
    ],
  },
];


/*
|--------------------------------------------------------------------------
| Tool Handlers
|--------------------------------------------------------------------------
|
| Gemini chooses a tool by name; we run the corresponding existing
| billing service function against Postgres.
|--------------------------------------------------------------------------
*/

const TOOL_HANDLERS = {
  get_billing_summary: () => getBillingSummaryTool(),
  get_partially_paid_bills: (input = {}) => getPartiallyPaidBillsTool(input),
  get_unpaid_bills: (input = {}) => getUnpaidBillsTool(input),
  get_paid_bills: (input = {}) => getPaidBillsTool(input),
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

// Turn our simple { role, content } history into Gemini Content[] parts.
// Gemini uses 'model' (not 'assistant') for the assistant role.
const toGeminiContents = (history) =>
  history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));


/*
|--------------------------------------------------------------------------
| Run Billing Assistant
|--------------------------------------------------------------------------
*/

const askBillingAssistant = async (message, history = []) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const contents = [
    ...toGeminiContents(history),
    { role: 'user', parts: [{ text: message }] },
  ];

  const toolsUsed = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        tools: TOOLS,
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const functionCalls = response.functionCalls || [];

    // No function call means Gemini has produced the final answer.
    if (functionCalls.length === 0) {
      return {
        reply: response.text || '',
        toolsUsed,
      };
    }

    // Preserve the model's turn (the function call parts) exactly as returned —
    // required so the next request has full context of what was requested.
    contents.push(response.candidates[0].content);

    // Execute every requested function and build the matching functionResponse parts.
    const functionResponseParts = [];

    for (const call of functionCalls) {
      const toolName = call.name;
      const toolInput = call.args || {};

      toolsUsed.push(toolName);

      const handler = TOOL_HANDLERS[toolName];
      let result;

      try {
        result = handler ? await handler(toolInput) : { error: `Unknown billing tool: ${toolName}` };
      } catch (error) {
        console.error(`Billing tool error (${toolName}):`, error);
        result = { error: error.message };
      }

      // IMPORTANT: Gemini expects `response` to be a plain object, not an array
      // or string — this is the part the previous version got wrong.
      functionResponseParts.push({
        functionResponse: {
          name: toolName,
          response: { result },
        },
      });
    }

    contents.push({ role: 'user', parts: functionResponseParts });
  }

  return {
    reply: "I wasn't able to complete the billing lookup. Please try a more specific question.",
    toolsUsed,
  };
};

module.exports = {
  askBillingAssistant,
};