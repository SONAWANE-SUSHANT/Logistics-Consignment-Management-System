const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const {
  getBillingSummary,
  getPartiallyPaidBills,
  getUnpaidBills,
  getPaidBills,
} = require('../../services/adminBillingService');

const getBillingSummaryTool = tool(
  async () => JSON.stringify(await getBillingSummary()),
  {
    name: 'get_billing_summary',
    description: 'Get overall freight billing statistics: totals, paid, pending, counts.',
    schema: z.object({}),
  }
);

const getPartiallyPaidBillsTool = tool(
  async ({ limit = 100 } = {}) => JSON.stringify(await getPartiallyPaidBills({ limit })),
  {
    name: 'get_partially_paid_bills',
    description: 'Bills with some payment received but not fully paid.',
    schema: z.object({ limit: z.number().max(500).optional() }),
  }
);

const getUnpaidBillsTool = tool(
  async ({ limit = 100 } = {}) => JSON.stringify(await getUnpaidBills({ limit })),
  {
    name: 'get_unpaid_bills',
    description: 'Bills with no payment recorded yet.',
    schema: z.object({ limit: z.number().max(500).optional() }),
  }
);

const getPaidBillsTool = tool(
  async ({ limit = 100 } = {}) => JSON.stringify(await getPaidBills({ limit })),
  {
    name: 'get_paid_bills',
    description: 'Fully paid bills.',
    schema: z.object({ limit: z.number().max(500).optional() }),
  }
);

module.exports = {
  getBillingSummaryTool,
  getPartiallyPaidBillsTool,
  getUnpaidBillsTool,
  getPaidBillsTool,
};