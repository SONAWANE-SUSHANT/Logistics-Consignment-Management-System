const express = require('express');
const router = express.Router();
const {
  previewFreightBill,
  getBillConsignments,
  createFreightBill,
  getFreightBills,
  getFreightBillById,
  recordFreightBillPayment,
  getFreightBillPayments,
  markFreightBillPaid,
  deleteFreightBill,
} = require('../controllers/freightBillController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);
router.get('/preview', previewFreightBill);
router.post('/preview', previewFreightBill);
router.get('/consignments', getBillConsignments);
router.route('/').get(getFreightBills).post(createFreightBill);
router.route('/:id/mark-paid').patch(markFreightBillPaid).post(markFreightBillPaid).put(markFreightBillPaid);
router.route('/:id/payments').get(getFreightBillPayments).post(recordFreightBillPayment);
router.route('/:id').get(getFreightBillById).delete(deleteFreightBill);

module.exports = router;