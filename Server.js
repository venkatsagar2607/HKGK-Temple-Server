const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const mongoURL = 'mongodb+srv://2100031756cseh_db_user:vq9LCPUbnrxAZTBp@cluster0.vjzr8po.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(mongoURL);

let db;
let userDetailsCollection;
let bedsCollection;

// --- Setup Nodemailer Transport ---
const transporteradmin = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hkgk.templead08@gmail.com',
    pass: 'thhu swps mtzk ifwo',
  },
});

const transporterfolk = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'folklead.hkgk08@gmail.com',
    pass: 'mjbt kqma xrtx xwvd',
  },
});

// --- Database Connect ---
async function start() {
  await client.connect();
  db = client.db('temples_datas');
  userDetailsCollection = db.collection('user_details');
  bedsCollection = db.collection('beds');
  app.listen(3001, () => console.log('Server running on 3001'));
}
start().catch(console.error);

// --- Bookings ---
app.post('/bookings', async (req, res) => {
  try {
    const {
      name, phoneNumber, email, folkGuidName, fromDate, toDate,
      checkinTime, aadharNumber, purpose
    } = req.body;

    const bookingDoc = {
      name, phoneNumber, email, folkGuidName, fromDate, toDate,
      checkinTime, aadharNumber, purpose,
      status: 'pending', assigned_bed: null
    };

    const result = await userDetailsCollection.insertOne(bookingDoc);

    // Fetch admin email
    const adminSettings = await db.collection('admin_settings').findOne({});
    const adminEmail = adminSettings ? adminSettings.adminEmail : null;

    if (adminEmail) {
      // Construct html message using template literals
      const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #007bff;">New Accommodation Request from ${name}</h2>
          <hr/>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td>${name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td>${phoneNumber}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td>${email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Folk Guide:</td><td>${folkGuidName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">From Date:</td><td>${fromDate}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">To Date:</td><td>${toDate}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Check-in Time:</td><td>${checkinTime}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Aadhaar Number:</td><td>${aadharNumber}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Purpose:</td><td>${purpose}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Booking ID:</td><td>${result.insertedId}</td></tr>
          </table>
          <hr />
          <div style="text-align:center; margin-top:24px;">
            <img src="cid:logoimg" alt="HKGK Logo" style="width:160px;" />
          </div>
        </div>
      `;

      const mailOptions = {
        from: 'Accomadation Request <hkgk.templead08@gmail.com>',
        to: 'hkgk.templead08@gmail.com',
        subject: 'New Accommodation Booking Received',
        html,
        attachments: [
          {
            filename: 'HKGK.jpg',
            path: path.join(__dirname, 'HKGK.jpg'),  // safer path
            cid: 'logoimg'  // must match img src cid
          }
        ]
      };

      transporteradmin.sendMail(mailOptions, (error, info) => {
        if (error) console.error('Error sending email:', error);
        else console.log('Email sent:', info.response);
      });
    }

    res.json({ success: true, bookingId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// --- Track Booking By Phone ---
app.post('/track', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const records = await userDetailsCollection.find({ phoneNumber }).toArray();
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Track All Bookings ---
app.post('/trackAll', async (req, res) => {
  try {
    const records = await userDetailsCollection.find({}).toArray();
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Update Booking Status (Approval / Rejection) ---
app.post('/updateBookingStatus', async (req, res) => {
  try {
    const { id, status } = req.body;
    const _id = new ObjectId(id);
    const updateResult = await userDetailsCollection.updateOne({ _id }, { $set: { status } });
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const user = await userDetailsCollection.findOne({ _id });

    let subject, html;
    if (status === "approved") {
      subject = "Your Booking Has Been Approved";
      html = `
        <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="color: #222; margin-bottom:12px"><b>Hare Krishna ${user.name}</b></h2>
          <p>Welcome to HKGK Accommodation!</p>
          <p>Your accommodation booking has been <span style="color: green; font-weight: bold;">APPROVED</span>.</p>
          <p><strong>Booking Details:</strong><br/>
          Name: ${user.name}<br/>
          Phone: ${user.phoneNumber}<br/>
          Email: ${user.email}<br/>
          Check-in: ${user.checkinTime}<br/>
          Guide: ${user.folkGuidName || 'N/A'}<br/>
          Dates: ${new Date(user.fromDate).toDateString()} to ${new Date(user.toDate).toDateString()}<br/>
          </p>
          <p style="margin-top:14px">Please reply for any further assistance. <br/> <b>Hare Krishna!</b></p>
          <hr />
          <div style="text-align:center; margin-top:24px;">
            <img src="cid:logoimg" alt="HKGK Logo" style="width:160px;"/>
          </div>
        </div>
      `;
    } else if (status === "denied" || status === "rejected") {
      subject = "Your Booking Has Been Rejected";
      html = `
        <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="color: #222; margin-bottom:12px"><b>Hare Krishna ${user.name}</b></h2>
          <p>We regret to inform you that your booking has been <span style="color: red; font-weight: bold;">REJECTED</span>.</p>
          <p>Please contact the admin for more information.</p>
          <hr />
          <div style="text-align:center; margin-top:24px;">
            <img src="cid:logoimg" alt="HKGK Logo" style="width:160px;"/>
          </div>
        </div>
      `;
    }

    // Send the email only for relevant status
    if ((status === "approved" || status === "denied" || status === "rejected") && user && user.email) {
      const mailOptions = {
        from: 'Temple Adminstrator <hkgk.templead08@gmail.com>',
        to: user.email,
        subject,
        html,
        attachments: [
          {
            filename: 'HKGK.jpg',
            path: './HKGK.jpg',
            cid: 'logoimg'
          }
        ]
      };
      transporteradmin.sendMail(mailOptions, (error, info) => {
        if (error) console.error('Error sending email:', error);
        else console.log('Approval/Rejection mail sent:', info.response);
      });
    }
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get Approved Users ---
app.get('/approved-users', async (req, res) => {
  try {
    const users = await userDetailsCollection.find({ status: { $in: ['approved', 'bed assigned'] } }).toArray();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get Beds ---
app.get('/get-beds', async (req, res) => {
  try {
    const beds = await bedsCollection.find({}).toArray();
    res.json({ success: true, beds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Remove User (and mark bed as available) ---
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

// --- Assign Bed and Notify User ---
app.post('/assign-bed', async (req, res) => {
  try {
    const { userId, bedId } = req.body;
    if (!userId || !bedId) {
      return res.status(400).json({ error: 'UserId and BedId are required' });
    }
    const _id = new ObjectId(userId);
    const cleanBedId = bedId.trim().replace(/\s/g, '');

    // Assign bed to user
    const userUpdateResult = await userDetailsCollection.updateOne(
      { _id },
      { $set: { assigned_bed: cleanBedId, status: 'bed assigned' } }
    );
    if (userUpdateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mark bed as occupied
    const bedUpdateResult = await bedsCollection.updateOne(
      { bedId: cleanBedId },
      { $set: { status: 'occupied' } }
    );

    // Fetch updated user details for mail
    const user = await userDetailsCollection.findOne({ _id });

    if (user && user.email) {
      // --- Send assignment mail: includes project and bed ---
      const mailOptions = {
        from: 'Folk Admin <folklead.hkgk08@gmail.com>', // Use the folkadmin or official address
        to: user.email,
        subject: `Bed Assigned - for your HKGK Accommodation`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; border-radius: 8px;">
            <h2 style="color: #222; margin-bottom:12px"><b>Hare Krishna ${user.name}</b></h2>
            <p>Your accommodation booking is confirmed for <b>HKGK Accommodation</b>.</p>
            <ul>
              <li style="color: green;"><strong>Bed Number:</strong> ${cleanBedId}</li>
              <li><strong>Project:</strong> HKGK Accommodation</li>
              <li><strong>Check-in time:</strong> ${user.checkinTime}</li>
              <li><strong>Folk Guide:</strong> ${user.folkGuidName || 'N/A'}</li>
            </ul>
            <p style="margin-top:14px">If you have any questions, please contact your folk guide. <br/> <b>Hare Krishna!</b></p>
            <hr />
            <div style="text-align:center; margin-top:24px;">
              <img src="cid:logoimg" alt="HKGK Logo" style="width:160px;"/>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: 'HKGK.jpg',
            path: './HKGK.jpg',
            cid: 'logoimg'
          }
        ]
      };
      transporterfolk.sendMail(mailOptions, (error, info) => {
        if (error) console.error('Assign Bed Email Error:', error);
        else console.log('Assign Bed Email Sent:', info.response);
      });
    }

    if (bedUpdateResult.modifiedCount >= 1) {
      return res.json({ success: true, message: "Bed assigned and user notified." });
    }
    res.json({ error: 'Bed update failed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
