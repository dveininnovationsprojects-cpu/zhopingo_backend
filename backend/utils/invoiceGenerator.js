const PDFDocument = require('pdfkit');
const fs = require('fs');

exports.generateInvoice = async (order) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const path = `./invoices/INV-${order._id}.pdf`;
  doc.pipe(fs.createWriteStream(path));

  // Branding
  doc.fontSize(25).text('ZHOPINGO', { align: 'center' });
  doc.fontSize(10).text('Official Tax Invoice', { align: 'center' });
  doc.moveDown();

  // Order Info
  doc.fontSize(12).text(`Order ID: ${order._id}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  // Table Header
  doc.text('Item', 50, 200);
  doc.text('HSN', 200, 200);
  doc.text('Qty', 300, 200);
  doc.text('GST%', 350, 200);
  doc.text('Total', 450, 200);

  // Excel Rule 5: HSN & GST Mapping
  order.items.forEach((item, i) => {
    const y = 220 + (i * 20);
    doc.text(item.productId.name.substring(0, 20), 50, y);
    doc.text(item.productId.hsnCode, 200, y);
    doc.text(item.quantity.toString(), 300, y);
    doc.text(`${item.productId.gstPercent}%`, 350, y);
    doc.text(`Rs.${item.priceAtBooking}`, 450, y);
  });

  doc.end();
  return path;
};