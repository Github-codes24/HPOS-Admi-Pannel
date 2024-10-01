const express = require("express");
const {
  getAllPatients, getAllPatientsCount, updateCervicalCancerPatient, deleteCervicalCancerPatient,
  getCenterCountsForCervicalCancer, getCervicalCancerPatientById, getPatientCountsForGraphForCervicalCancer
} = require("../controllers/cervicalPatientController");
const router = express.Router();

router.get("/getAllPatients", getAllPatients);
router.get("/getAllPatientsCount", getAllPatientsCount);
router.put("/updateCervicalCancerPatient/:patientId", updateCervicalCancerPatient);
router.post("/deleteCervicalCancerPatient/:patientId", deleteCervicalCancerPatient);
router.get("/getCervicalCancerPatientById/:patientId", getCervicalCancerPatientById);
router.get("/getCenterCountsForCervicalCancer", getCenterCountsForCervicalCancer);
router.get("/getPatientCountsForGraphForCervicalCancer", getPatientCountsForGraphForCervicalCancer);

module.exports = router;
