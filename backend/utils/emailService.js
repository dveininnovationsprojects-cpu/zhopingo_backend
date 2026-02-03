const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // உங்கள் ஜிமெயில் ஐடி
    pass: process.env.EMAIL_PASS  // ஜிமெயில் ஆப் பாஸ்வேர்டு
  }
});

exports.sendAdminNotification = async (sellerData) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'navinvms2065@gmail.com', 
    subject: 'New Seller Registration Alert - Zhopingo',
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0c831f;">New Seller Registration!</h2>
        <p>A new seller has just registered on the platform and is awaiting KYC submission.</p>
        <hr/>
        <p><strong>Shop Name:</strong> ${sellerData.shopName}</p>
        <p><strong>Owner Name:</strong> ${sellerData.name}</p>
        <p><strong>Phone Number:</strong> ${sellerData.phone}</p>
        <p><strong>Email:</strong> ${sellerData.email || 'Not Provided'}</p>
        <hr/>
        <p>Please log in to the <b>Admin Dashboard</b> to view further details.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};