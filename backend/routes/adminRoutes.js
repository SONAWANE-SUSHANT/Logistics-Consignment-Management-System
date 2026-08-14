const express = require('express');

const router = express.Router();

const {
  billingSummary,
  partiallyPaidBills,
  unpaidBills,
  paidBills,
  aiAssistant,
} = require('../controllers/adminController');

const { protect } = require('../middlewares/authMiddleware');


router.use(protect);


/*
 * Admin billing data
 */

router.get('/billing/summary', billingSummary);

router.get('/billing/partially-paid', partiallyPaidBills);

router.get('/billing/unpaid', unpaidBills);

router.get('/billing/paid', paidBills);


/*
 * AI billing assistant
 */

router.post('/ai/ask', aiAssistant);


module.exports = router;