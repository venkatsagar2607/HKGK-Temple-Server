const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json()); // For JSON bodies

// const storage = multer.diskStorage({
//   destination: './uploads/',
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });
// const upload = multer({ storage });

const mongoURL = 'mongodb+srv://harekrishna:radheradhe@templecluster.13612io.mongodb.net/?retryWrites=true&w=majority&appName=TempleCluster';
const client = new MongoClient(mongoURL);

let db;
let userDetailsCollection;
let bedsCollection;

async function start() {
  await client.connect();
  db = client.db('temple_data');
  userDetailsCollection = db.collection('user_details');
  bedsCollection = db.collection('beds');
  app.listen(3001, () => console.log('Server running on 3001'));
}
start().catch(console.error);

// POST /bookings - insert booking along with uploaded file paths
app.post('/bookings', async (req, res) => {
  try {
    console.log(req.body)
    const {
      name, phoneNumber, folkGuidName, fromDate, toDate,
      checkinTime, aadharNumber, purpose
    } = req.body;

    // const yourPhoto = req.files['yourPhoto'] ? req.files['yourPhoto'][0].path : null;
    // const aadharImage = req.files['aadharImage'] ? req.files['aadharImage'][0].path : null;

    const bookingDoc = {
      name,
      phoneNumber,
      folkGuidName,
      fromDate,
      toDate,
      checkinTime,
      aadharNumber,
      purpose,
      status: 'pending',
      assigned_bed: null
    };

    const result = await userDetailsCollection.insertOne(bookingDoc);
    res.json({ success: true, bookingId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /track - find all bookings with matching phoneNumber
app.post('/track', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const records = await userDetailsCollection.find({ phoneNumber }).toArray();
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /trackAll - find all bookings
app.post('/trackAll', async (req, res) => {
  try {
    const records = await userDetailsCollection.find({}).toArray();
    console.log(records)
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// app.get('/insert', async (req, res) => {
//   const documents = [
//     { bedId: "V-01", status: "available" },
//     { bedId: "V-02", status: "available" },
//     { bedId: "V-03", status: "available" },
//     { bedId: "V-04", status: "available" },
//     { bedId: "V-05", status: "available" },
//     { bedId: "V-06", status: "available" },
//     { bedId: "V-07", status: "available" },
//     { bedId: "V-08", status: "available" },
//     { bedId: "V-09", status: "available" },
//     { bedId: "V-10", status: "available" },
//     { bedId: "V-11", status: "available" },
//     { bedId: "V-12", status: "available" },
//     { bedId: "V-13", status: "available" },
//     { bedId: "V-14", status: "available" },
//     { bedId: "V-15", status: "available" },
//     { bedId: "V-16", status: "available" },
//     { bedId: "V-17", status: "available" },
//     { bedId: "V-18", status: "available" },
//     { bedId: "V-19", status: "available" },
//     { bedId: "V-20", status: "available" },
//     { bedId: "V-21", status: "available" },
//     { bedId: "V-22", status: "available" },
//     { bedId: "V-23", status: "available" },
//     { bedId: "V-24", status: "available" },
//     { bedId: "V-25", status: "available" },
//     { bedId: "V-26", status: "available" },
//     { bedId: "V-27", status: "available" },
//     { bedId: "V-28", status: "available" },
//     { bedId: "V-29", status: "available" },
//     { bedId: "V-30", status: "available" },
//     { bedId: "M-01", status: "available" },
//     { bedId: "M-02", status: "available" },
//     { bedId: "M-03", status: "available" },
//     { bedId: "M-04", status: "available" },
//     { bedId: "M-05", status: "available" },
//     { bedId: "M-06", status: "available" },
//     { bedId: "M-07", status: "available" },
//     { bedId: "M-08", status: "available" },
//     { bedId: "M-09", status: "available" },
//     { bedId: "M-10", status: "available" },
//     { bedId: "D-01", status: "available" },
//     { bedId: "D-02", status: "available" },
//     { bedId: "D-03", status: "available" },
//     { bedId: "D-04", status: "available" },
//     { bedId: "D-05", status: "available" },
//     { bedId: "D-06", status: "available" },
//     { bedId: "D-07", status: "available" },
//     { bedId: "D-08", status: "available" },
//     { bedId: "D-09", status: "available" },
//     { bedId: "D-10", status: "available" }
//   ];

//   const result = await bedsCollection.insertMany(documents)
//   console.log(result)
//   console.log(result.insertedCount + ' documents inserted');

// })

// POST /updateBookingStatus - update status by booking id

app.post('/updateBookingStatus', async (req, res) => {
  try {
    console.log(req.body)
    const { id, status } = req.body;
    const _id = new ObjectId(id);

    const updateResult = await userDetailsCollection.updateOne(
      { _id },
      { $set: { status } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /approved-users - find bookings with status 'approved' or 'bed assigned'
app.get('/approved-users', async (req, res) => {
  try {
    const users = await userDetailsCollection.find({ status: { $in: ['approved', 'bed assigned'] } }).toArray();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /get-beds - fetch all beds
app.get('/get-beds', async (req, res) => {
  try {
    const beds = await bedsCollection.find({}).toArray();
    res.json({ success: true, beds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /remove-user - delete user and mark bed available
app.post('/remove-user', async (req, res) => {
  try {
    const { userId, bedId } = req.body;
    if (!userId || !bedId) {
      return res.status(400).json({ error: 'UserId and BedId are required' });
    }
    const _id = new ObjectId(userId);
    const cleanBedId = bedId.trim().replace(/\s/g, '');

    const deleteResult = await userDetailsCollection.deleteOne({ _id });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bedUpdateResult = await bedsCollection.updateOne(
      { bedId: cleanBedId },
      { $set: { status: 'available' } }
    );

    if (bedUpdateResult.modifiedCount >= 1) {
      return res.json({ success: true, message: "User Removed" });
    }
    res.json({ error: 'Bed update failed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /assign-bed - assign bed to user and mark bed occupied
app.post('/assign-bed', async (req, res) => {
  try {
    const { userId, bedId } = req.body;
    if (!userId || !bedId) {
      return res.status(400).json({ error: 'UserId and BedId are required' });
    }
    const _id = new ObjectId(userId);
    const cleanBedId = bedId.trim().replace(/\s/g, '');

    const userUpdateResult = await userDetailsCollection.updateOne(
      { _id },
      { $set: { assigned_bed: cleanBedId } }
    );
    if (userUpdateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bedUpdateResult = await bedsCollection.updateOne(
      { bedId: cleanBedId },
      { $set: { status: 'occupied' } }
    );

    if (bedUpdateResult.modifiedCount >= 1) {
      return res.json({ success: true, message: "Success" });
    }
    res.json({ error: 'Bed update failed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
