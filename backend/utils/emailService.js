const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendAdminNotification = async (sellerData, type = "Registration") => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'navinvms2065@gmail.com', // அட்மின் மெயில்
    subject: `[Zhopingo] New Seller ${type} Alert`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0c831f;">New Seller ${type}!</h2>
        <p>A seller has ${type === "Registration" ? "just registered" : "submitted their KYC documents"}.</p>
        <hr/>
        <p><strong>Shop Name:</strong> ${sellerData.shopName}</p>
        <p><strong>Owner Name:</strong> ${sellerData.name}</p>
        <p><strong>Phone:</strong> ${sellerData.phone}</p>
        <hr/>
        <p>Please log in to the <b>Admin Dashboard</b> to review and approve this seller.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};