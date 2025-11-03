const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");

router.post("/", customerController.createCustomers);
router.get("/", customerController.getAllCustomers);
router.get("/:id", customerController.getCustomerById);
router.patch("/:id", customerController.updateCustomerById);
router.delete("/:id", customerController.deleteCustomerById);

module.exports = router;