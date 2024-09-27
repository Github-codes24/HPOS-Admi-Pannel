const CervicalPatient = require("../models/cervicalPatientModel");

// GET: Retrieve all patient records
const getAllPatients = async (req, res) => {
  try {
    const allPatients = await CervicalPatient.find();
    const totalCount = allPatients.length;
    return res.status(200).json({ totalCount: totalCount, data: allPatients });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving patient records", error });
  }
};

module.exports = { getAllPatients };
