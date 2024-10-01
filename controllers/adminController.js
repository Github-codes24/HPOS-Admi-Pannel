const Joi = require("joi");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const User = require("../models/admin");
const { default: mongoose } = require("mongoose");
const { use } = require("../routes/adminroutes");
const BCRYPT_SALTS = Number(process.env.BCRYPT_SALTS); // Number of salt rounds for bcrypt hashing
const ObjectId = mongoose.Types.ObjectId;

// POST - Register User
const registerUser = async (req, res) => {
    // Data Validation using Joi
    const isValid = Joi.object({
        Fullname: Joi.string().required(),
        username: Joi.string().min(3).max(25).alphanum().required(),
        password: Joi.string().min(8).required(),
        confirmpassword: Joi.string().min(8).required(),
    }).validate(req.body);

    // Check if validation failed
    if (isValid.error) {
        return res.status(400).send({
            status: 400,
            message: "Invalid Input",
            data: isValid.error,
        });
    }

    // Check if passwords match
    if (req.body.password !== req.body.confirmpassword) {
        return res.status(400).send({
            status: 400,
            message: "Passwords do not match",
        });
    }

    try {
        // Check if the Fullname orusername already exists in the database
        const userExists = await User.find({
            $or: [{ username: req.body.username }],
        });

        // If user already exists, return an error
        if (userExists.length !== 0) {
            return res.status(400).send({
                status: 400,
                message: "Username/Mobile number already exists",
            });
        }
    } catch (err) {
        // Handle error while checking existing user
        return res.status(400).send({
            status: 400,
            message: "Error while checking if username or mobile number exists",
            data: err,
        });
    }

    // Hash the user's password before saving
    const hashedPassword = await bcrypt.hash(req.body.password, BCRYPT_SALTS);

    // Generate a JWT token for the user
    const token = await jwt.sign(
        {
            Fullname: req.body.userid,
            password: hashedPassword,
        },
        process.env.JWT_SECRET
    );
    console.log(token);

    // Create a new user object with the hashed password and token
    const userObj = new User({
        Fullname: req.body.Fullname,
        password: hashedPassword,
        username: req.body.username,
        token: token,
    });

    try {
        await userObj.save();

        return res.status(201).send({
            status: 201,
            message: "User registered successfully",
        });
    } catch (err) {
        return res.status(400).send({
            status: 400,
            message: "Error while save user to DB",
            data: err,
        });
    }
};
// POST - Login User
const loginUser = async (req, res) => {
    const { userName, password } = req.body;

    // Validate the login data using Joi
    const isValid = Joi.object({
        userName: Joi.string().required(),
        password: Joi.string().required(),
    }).validate(req.body);

    // Check if validation failed
    if (isValid.error) {
        return res.status(400).send({
            status: 400,
            message: "Invalid Username/password",
            data: isValid.error,
        });
    }

    let userData;

    try {
        // Find the user in the database by Fullname
        userData = await User.findOne({ userName });

        // If no user is found, return an error
        if (!userData) {
            return res.status(400).send({
                status: 400,
                message: "No user found! Please register",
            });
        }
    } catch (err) {
        // Handle error while fetching user data
        return res.status(400).send({
            status: 400,
            message: "Error while fetching user data",
            data: err,
        });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordSame = await bcrypt.compare(password, userData.password);

    // If the password does not match, return an error
    if (!isPasswordSame) {
        return res.status(400).send({
            status: 400,
            message: "Incorrect Password",
        });
    }
    console.log(userData);

    const payload = {
        fullName: userData.fullName,
        username: userData.userName,
        userId: userData._id,
        password: userData.password,
    };

    // Generate a JWT token (if needed)
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    // Send success response
    return res.status(200).send({
        status: 200,
        message: "User Logged in successfully",
        data: { token, payload }, // Uncomment if you want to return the token and payload
    });
};

const BPatient = require("../models/breastPatientModel");
const CPatient = require("../models/cervicalPatientModel");
const SPatient = require("../models/sickleCellPatientModel");

// GET: Retrieve all patient records
const getAllPatients = async (req, res) => {
  try {
    const { personalName, resultStatus, fromDate, toDate, HPLC, centerCode, bloodStatus, cardStatus } = req.query;

     // Build the filter object dynamically
    const queryFilter = {};

    // Apply filters only if query parameters are provided
    if (personalName) queryFilter.personalName = personalName
    if (resultStatus) queryFilter.resultStatus = resultStatus;
    if (HPLC) queryFilter.HPLC = HPLC;
    if (centerCode) queryFilter.centerCode = centerCode;
    if (bloodStatus) queryFilter.bloodStatus = bloodStatus;
    if (cardStatus) queryFilter.cardStatus = cardStatus;

    // Apply date range filtering for createdAt field if fromDate and toDate are provided
    if (fromDate && fromDate !== null && toDate && toDate !== null) {
      queryFilter.createdAt = {
        $gte: new Date(new Date(fromDate).setHours(00, 00, 00)),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59))
      };
    }

    const allBreastCancerPatients = await BPatient.find(queryFilter);
    const allCervicalCancerPatients = await CPatient.find(queryFilter);
    const allSickleCellCancerPatients = await SPatient.find(queryFilter);

    // Combine all patients into a single array
    const totalData = [
        ...allBreastCancerPatients,
        ...allCervicalCancerPatients,
        ...allSickleCellCancerPatients
      ];
    return res.status(200).json({ totalData: totalData });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving patient records", error });
  }
};

const getAllPatientsCount = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    console.log(typeof fromDate, typeof toDate)

    // Convert empty strings to undefined
    // fromDate = fromDate =.== '' ? undefined : fromDate;
    // toDate = toDate === '' ? undefined : toDate;

    // Build the date filter if fromDate and toDate are provided
    const dateFilter = {};
    if (fromDate && fromDate !== null && toDate && toDate !== null) {
      dateFilter.createdAt = {
        $gte: new Date(new Date(fromDate).setHours(00, 00, 00)),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59))
      };
    }

    // Apply the date filter to each patient type
    const allBreastCancerPatients = await BPatient.find(dateFilter);
    const allCervicalCancerPatients = await CPatient.find(dateFilter);
    const allSickleCellCancerPatients = await SPatient.find(dateFilter);

    // Combine all patients into a single array
    const totalData = [
        ...allBreastCancerPatients,
        ...allCervicalCancerPatients,
        ...allSickleCellCancerPatients
      ];
    const totalCount = totalData.length;
    return res.status(200).json({ totalCount: totalCount, allBreastCancerPatients: allBreastCancerPatients.length,
        allCervicalCancerPatients: allCervicalCancerPatients.length, allSickleCellCancerPatients: allSickleCellCancerPatients.length
     });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving patient records", error });
  }
};

const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params; // Patient ID from the request parameters
    const updatedData = req.body; // Updated patient data coming from the request body

    let patient1, patient2, patient3;
    // Try to find the patient in each model, stop once found
    patient1 = await BPatient.findById(patientId);
    if (!patient1) {
        patient2 = await CPatient.findById(patientId);
    };
    if (!patient2) {
        patient3 = await SPatient.findById(patientId);
    };

    // If patient is not found in any of the models
    if (!patient1 && !patient2 && !patient3) {
      return res.status(404).json({ message: "Patient not found in any records" });
    };
    // Check if the request body has any fields for update
    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({
        message: "No fields provided for update. Please pass at least one field to update.",
      });
    };
    if (patient1) {
      await BPatient.findByIdAndUpdate(patientId, updatedData, { new: true });
      return res.status(200).json({ message: "Breast cancer patient updated successfully" });
    };
    if (patient2) {
      await CPatient.findByIdAndUpdate(patientId, updatedData, { new: true });
      return res.status(200).json({ message: "Cervical cancer patient updated successfully" });
    };
    if (patient3) {
      await SPatient.findByIdAndUpdate(patientId, updatedData, { new: true });
      return res.status(200).json({ message: "Sickle cell patient updated successfully" });
    };
    
  } catch (error) {
    return res.status(500).json({
      message: "Error updating patient data",
      error: error.message,
    });
  }
};

const getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params; // Patient ID from the request parameters

    let patient1, patient2, patient3;
    // Try to find the patient in each model, stop once found
    patient1 = await BPatient.findById(patientId);
    if (!patient1) {
        patient2 = await CPatient.findById(patientId);
    };
    if (!patient2) {
        patient3 = await SPatient.findById(patientId);
    };

    // If patient is not found in any of the models
    if (!patient1 && !patient2 && !patient3) {
      return res.status(404).json({ message: "Patient not found in any records" });
    };
    if (patient1) {
      return res.status(200).json({ message: "Breast cancer patient fetched successfully", data: patient1 });
    };
    if (patient2) {
      return res.status(200).json({ message: "Cervical cancer patient fetched successfully", data: patient2  });
    };
    if (patient3) {
      return res.status(200).json({ message: "Sickle cell patient fetched successfully", data: patient3  });
    };
    
  } catch (error) {
    return res.status(500).json({
      message: "Error updating patient data",
      error: error.message,
    });
  }
};


const getCenterCountsByCenterAndDate = async (req, res) => {
  try {
    // Aggregation to count patients grouped by `centerName` and the day they were created
    const breastCancerCounts = await BPatient.aggregate([
      {
        $group: {
          _id: {
            centerName: "$centerName",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          breastCancerCount: { $sum: 1 }
        }
      }
    ]);

    const cervicalCancerCounts = await CPatient.aggregate([
      {
        $group: {
          _id: {
            centerName: "$centerName",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          cervicalCancerCount: { $sum: 1 }
        }
      }
    ]);

    const sickleCellCancerCounts = await SPatient.aggregate([
      {
        $group: {
          _id: {
            centerName: "$centerName",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          sickleCellCancerCount: { $sum: 1 }
        }
      }
    ]);

    // Combine counts by merging arrays and summing values for the same company and date
    const totalData = {};

    // Helper function to accumulate data
    const accumulateCounts = (dataArray, diseaseField) => {
      dataArray.forEach(({ _id, [diseaseField]: count }) => {
        const key = `${_id.centerName}-${_id.date}`;
        if (!totalData[key]) {
          totalData[key] = { centerName: _id.centerName, date: _id.date, totalCount: 0 };
        }
        // totalData[key][diseaseField] = count;
        totalData[key].totalCount += count;
      });
    };

    // Accumulate data for each disease
    accumulateCounts(breastCancerCounts, "breastCancerCount");
    accumulateCounts(cervicalCancerCounts, "cervicalCancerCount");
    accumulateCounts(sickleCellCancerCounts, "sickleCellCancerCount");

    // Convert the totalData object back to an array and sort by date
    const sortedTotalData = Object.values(totalData).sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({ totalData: sortedTotalData });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving patient records",
      error: error.message,
    });
  }
};


const getPatientCountsForGraph = async (req, res) => {
  try {
    const { timeFrame } = req.query; // 'daily', 'weekly', or 'monthly'

    if (!timeFrame) {
      return res.status(400).json({ status: false, message: "timeFrame is a required field" });
    }

    // Get the current date
    const now = new Date();
    let startDate, endDate, dateFormat, isWeekly = false;

    if (timeFrame === 'daily') {
      // For daily, we group by hour of the current day
      startDate = new Date(now.setHours(0, 0, 0, 0)); // Start of the day (12:00 AM)
      endDate = new Date(now.setHours(23, 59, 59, 999)); // End of the day (11:59 PM)
      dateFormat = '%Y-%m-%d %H:00'; // Group by hour (e.g., "2024-10-01 13:00" for 1 PM)
    } else if (timeFrame === 'weekly') {
      // Weekly: Filter for the current week (Monday to Sunday)
      const currentDay = now.getDay();
      const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to Monday
      startDate = new Date(now.setDate(diff)); // Set to the Monday of the current week
      startDate.setHours(0, 0, 0, 0); // Start of the week (12:00 AM)
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6); // End of the week (Sunday)
      endDate.setHours(23, 59, 59, 999);
      dateFormat = '%Y-%m-%d'; // Group by date for now, we'll map the days after fetching data
      isWeekly = true;
    } else if (timeFrame === 'monthly') {
      // Monthly: Filter for the current year (January to December)
      startDate = new Date(now.getFullYear(), 0, 1); // Start of the year (Jan 1)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // End of the year (Dec 31)
      dateFormat = '%Y-%m'; // Group by month
    } else {
      return res.status(400).json({ message: "Invalid time frame. Choose 'daily', 'weekly', or 'monthly'." });
    }

    // Aggregation pipeline for each type of patient (breast cancer, cervical cancer, sickle cell)
    const breastCancerCounts = await BPatient.aggregate([
      {
        $match: { createdAt: { $gte: startDate, $lte: endDate } } // Filter by date range
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: "$createdAt" } }
          },
          breastCancerCount: { $sum: 1 }
        }
      }
    ]);

    const cervicalCancerCounts = await CPatient.aggregate([
      {
        $match: { createdAt: { $gte: startDate, $lte: endDate } } // Filter by date range
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: "$createdAt" } }
          },
          cervicalCancerCount: { $sum: 1 }
        }
      }
    ]);

    const sickleCellCancerCounts = await SPatient.aggregate([
      {
        $match: { createdAt: { $gte: startDate, $lte: endDate } } // Filter by date range
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: "$createdAt" } }
          },
          sickleCellCancerCount: { $sum: 1 }
        }
      }
    ]);

    // Initialize a combined data object to accumulate counts by date or hour
    const totalData = {};

    // Helper function to accumulate counts for each type of disease
    const accumulateCounts = (dataArray, diseaseField) => {
      dataArray.forEach(({ _id, [diseaseField]: count }) => {
        const key = _id.date; // Unique key by date/hour
        if (!totalData[key]) {
          totalData[key] = { time: _id.date, totalCount: 0 }; // Initialize with `time` and `totalCount`
        }
        totalData[key].totalCount += count; // Accumulate the total count across centers
      });
    };

    // Accumulate counts for each disease type
    accumulateCounts(breastCancerCounts, "breastCancerCount");
    accumulateCounts(cervicalCancerCounts, "cervicalCancerCount");
    accumulateCounts(sickleCellCancerCounts, "sickleCellCancerCount");

    // If weekly, map the dates to day names (Monday, Tuesday, etc.)
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sortedTotalData = Object.values(totalData).map(entry => {
      if (isWeekly) {
        const dayIndex = new Date(entry.time).getDay();
        return {
          ...entry,
          dayName: weekDays[dayIndex], // Add day name
        };
      }
      return entry;
    }).sort((a, b) => {
      if (isWeekly) {
        // Sort by day of the week (Monday to Sunday)
        return weekDays.indexOf(a.dayName) - weekDays.indexOf(b.dayName);
      }
      // Otherwise, sort by date/time
      return new Date(a.time) - new Date(b.time);
    });

    // Return the response with aggregated and sorted data
    return res.status(200).json({ totalData: sortedTotalData });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving patient records",
      error: error.message,
    });
  }
};




const deletePatient = async (req, res) => {
  try {
    const { patientId } = req.params; // Patient ID from the request parameters

    let patient1, patient2, patient3;
    // Try to find the patient in each model, stop once found
    patient1 = await BPatient.findById(patientId);
    if (!patient1) {
        patient2 = await CPatient.findById(patientId);
    };
    if (!patient2) {
        patient3 = await SPatient.findById(patientId);
    };

    // If patient is not found in any of the models
    if (!patient1 && !patient2 && !patient3) {
      return res.status(404).json({ message: "Patient not found in any records" });
    };
    if (patient1) {
      await BPatient.findByIdAndUpdate(patientId, { isDeleted: true });
      return res.status(200).json({ message: "Breast cancer patient deleted successfully" });
    };
    if (patient2) {
      await CPatient.findByIdAndUpdate(patientId, { isDeleted: true });
      return res.status(200).json({ message: "Cervical cancer patient deleted successfully" });
    };
    if (patient3) {
      await SPatient.findByIdAndUpdate(patientId, { isDeleted: true });
      return res.status(200).json({ message: "Sickle cell patient deleted successfully" });
    };
    
  } catch (error) {
    return res.status(500).json({
      message: "Error updating patient data",
      error: error.message,
    });
  }
};

module.exports = { registerUser, loginUser, getAllPatients, getAllPatientsCount, updatePatient, deletePatient,
    getPatientCountsForGraph, getPatientById, getCenterCountsByCenterAndDate };
