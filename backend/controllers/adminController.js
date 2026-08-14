const {
  getBillingSummary,
  getPartiallyPaidBills,
  getUnpaidBills,
  getPaidBills,
} = require('../services/adminBillingService');

const { askBillingAssistant } = require('../services/aiBillingAssistantService');

/*
 * Admin Billing Controller
 *
 * Thin HTTP layer over adminBillingService. All the actual
 * query logic lives in the service so it stays reusable by
 * LangGraph tools / other callers.
 */

const billingSummary = async (req, res) => {
  try {
    const summary = await getBillingSummary();
    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error('[adminController] billingSummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch billing summary',
    });
  }
};

const partiallyPaidBills = async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const bills = await getPartiallyPaidBills({ limit, offset });
    return res.status(200).json({ success: true, data: bills });
  } catch (error) {
    console.error('[adminController] partiallyPaidBills error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch partially paid bills',
    });
  }
};

const unpaidBills = async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const bills = await getUnpaidBills({ limit, offset });
    return res.status(200).json({ success: true, data: bills });
  } catch (error) {
    console.error('[adminController] unpaidBills error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unpaid bills',
    });
  }
};

const paidBills = async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const bills = await getPaidBills({ limit, offset });
    return res.status(200).json({ success: true, data: bills });
  } catch (error) {
    console.error('[adminController] paidBills error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch paid bills',
    });
  }
};

/*
 * AI billing assistant
 *
 * Body: { message: string, history?: Array<{ role: 'user'|'assistant', content: string }> }
 */
const aiAssistant = async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty "message" field is required.',
      });
    }

    if (history && !Array.isArray(history)) {
      return res.status(400).json({
        success: false,
        message: '"history" must be an array of { role, content } turns.',
      });
    }

    const { reply, toolsUsed } = await askBillingAssistant(message.trim(), history || []);

    return res.status(200).json({
      success: true,
      data: { reply, toolsUsed },
    });
  } catch (error) {
    console.error('[adminController] aiAssistant error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get a response from the assistant',
    });
  }
};

module.exports = {
  billingSummary,
  partiallyPaidBills,
  unpaidBills,
  paidBills,
  aiAssistant,
};