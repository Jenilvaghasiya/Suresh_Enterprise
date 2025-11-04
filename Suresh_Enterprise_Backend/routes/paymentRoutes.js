const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/", paymentController.createPayment);
router.get("/customer/:customerId", paymentController.getPaymentsByCustomer);
router.get("/balance/:id", paymentController.getCustomerBalance);
router.post("/razorpay/order", paymentController.createRazorpayOrder);

module.exports = router;
