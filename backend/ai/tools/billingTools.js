const {
  getPartiallyPaidBills,
  getUnpaidBills,
  getPaidBills,
  getBillingSummary,
} = require('../../services/adminBillingService');


// LangGraph tool
const getPartiallyPaidBillsTool = async ({ limit = 100 }) => {
  return await getPartiallyPaidBills({ limit });
};


const getUnpaidBillsTool = async ({ limit = 100 }) => {
  return await getUnpaidBills({ limit });
};


const getPaidBillsTool = async ({ limit = 100 }) => {
  return await getPaidBills({ limit });
};


const getBillingSummaryTool = async () => {
  return await getBillingSummary();
};


module.exports = {
  getPartiallyPaidBillsTool,
  getUnpaidBillsTool,
  getPaidBillsTool,
  getBillingSummaryTool,
};