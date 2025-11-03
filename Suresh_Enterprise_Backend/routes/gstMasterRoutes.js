const express = require("express");
const router = express.Router();
const gstMasterController = require("../controllers/gstMasterController");

router.post("/", gstMasterController.createGstMasters);
router.get("/", gstMasterController.getAllGstMasters);
router.get("/:id", gstMasterController.getGstMasterById);
router.patch("/:id", gstMasterController.updateGstMasterById);
router.delete("/:id", gstMasterController.deleteGstMasterById);

module.exports = router;