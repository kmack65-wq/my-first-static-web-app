// api/shared/generateReceipt.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

module.exports = async function generateReceipt({ fullName, companyName }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `Receipt_${fullName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
      const filePath = path.join('/tmp', fileName);
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // PDF Content
      doc.fontSize(20).text('Subcontractor Safety Acknowledgement', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(14).text(`Name: ${fullName}`);
      doc.text(`Company: ${companyName}`);
      doc.text(`Date: ${new Date().toLocaleString()}`);
      doc.moveDown(2);
      doc.fontSize(12).text('I acknowledge that I have completed the required safety orientation.', { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve({ filePath, fileName });
      });
      
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
};
