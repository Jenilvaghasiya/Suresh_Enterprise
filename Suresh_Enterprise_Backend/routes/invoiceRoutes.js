const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoiceController");

router.post("/", invoiceController.createInvoice);
router.get("/", invoiceController.getAllInvoices);
router.get("/company/:id", invoiceController.getInvoicesByCompanyId);
router.get("/user/:userId", invoiceController.getInvoicesByUserId);
router.get("/:id/pdf", invoiceController.generateInvoicePDF);
router.get("/:id", invoiceController.getInvoiceById);
router.patch("/:id", invoiceController.updateInvoiceById);
router.delete("/:id", invoiceController.deleteInvoiceById);

module.exports = router;