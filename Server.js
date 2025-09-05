const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
// Do NOT use express.json() for FormData uploads!


const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Venkatsagar@26',
  database: 'temple_bookings_deatils'
});

app.post('/bookings', upload.fields([
  { name: 'yourPhoto', maxCount: 1 },
  { name: 'aadharImage', maxCount: 1 }
]), (req, res) => {
  const {
    name, phoneNumber, folkGuidName, fromDate, toDate,
    checkinTime, aadharNumber, purpose
  } = req.body;

  const yourPhoto = req.files['yourPhoto'] ? req.files['yourPhoto'][0].path : null;
  const aadharImage = req.files['aadharImage'] ? req.files['aadharImage'][0].path : null;

  const sql = `INSERT INTO user_details(name, phoneNumber, folkGuidName, fromDate, toDate, checkinTime, yourPhoto, aadharNumber, aadharImage, purpose, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [name, phoneNumber, folkGuidName, fromDate, toDate, checkinTime, yourPhoto, aadharNumber, aadharImage, purpose, 'pending'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, bookingId: result.insertId });
  });
});

app.post('/track', (req, res) => {
  const { phoneNumber } = req.body;

  const sql = `SELECT * FROM user_details WHERE phoneNumber = ?`;
  db.query(sql, [phoneNumber], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ success: true, records: result });
  });
});

app.post('/trackAll', (req, res) => {
  const { phoneNumber } = req.body;

  const sql = `SELECT * FROM user_details`;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ success: true, records: result });
  });
});

app.post('/updateBookingStatus', (req, res) => {
  const { id, status } = req.body;

  const sql = `UPDATE user_details SET status = ? WHERE id = ?`;
  db.query(sql, [status, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Status updated successfully' });
  });
});

app.get('/approved-users', (req, res) => {
  const sql = 'SELECT * FROM user_details WHERE status IN (?, ?)';
  db.query(sql, ['approved', 'bed assigned'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, users: result });
  });
});

app.get('/get-beds', (req, res) => {
  const sql = 'SELECT * FROM beds';
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, beds: result });
  });
});

app.post("/remove-user", (req, res) => {
  const { userId, bedId } = req.body;
  if (!userId || !bedId) {
    return res.status(400).json({ error: 'UserId and BedId are required' });
  }

  const sqlUserUpdate = `DELETE FROM user_details WHERE id = ?`;

  db.query(sqlUserUpdate, [userId], (err, result) => {
    if (err) {
      console.error('Error updating bed assignment on user_details:', err);
      return res.status(500).json({ error: 'User update failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sqlBedUpdate = `UPDATE beds SET status = 'available' WHERE bedId = ?`;
    const cleanBedId = bedId.trim().replace(/\s/g, '');

    db.query(sqlBedUpdate, [cleanBedId], (bedErr, result) => {
      if (bedErr) {
        console.error('Error updating bed status:', bedErr);
        return res.json({ ermessageror: 'Bed update failed' });
      }
      if (result.affectedRows >= 1)
        return res.json({ success: true, message: "User Removed" })
      // success response here
    });

  });
})

app.post('/assign-bed', (req, res) => {
  const { userId, bedId } = req.body;
  console.log('Assign bed request:', { userId, bedId });

  if (!userId || !bedId) {
    return res.status(400).json({ error: 'UserId and BedId are required' });
  }

  const sqlUserUpdate = `UPDATE user_details SET assigned_bed = ? WHERE id = ?`;
  db.query(sqlUserUpdate, [bedId, userId], (err, result) => {
    if (err) {
      console.error('Error updating bed assignment on user_details:', err);
      return res.status(500).json({ error: 'User update failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sqlBedUpdate = `UPDATE beds SET status = 'occupied' WHERE bedId = ?`;
    const cleanBedId = bedId.trim().replace(/\s/g, '');

    db.query(sqlBedUpdate, [cleanBedId], (bedErr, result) => {
      if (bedErr) {
        console.error('Error updating bed status:', bedErr);
        return res.json({ ermessageror: 'Bed update failed' });
      }
      if (result.affectedRows >= 1)
        return res.json({ success: true, message: "Success" })
      // success response here
    });

  });
});


app.listen(3002, () => console.log('Server running on 3002'));
