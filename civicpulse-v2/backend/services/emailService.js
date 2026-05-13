const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const templates = {
  issueCreated: (issue) => ({
    subject: `[CivicPulse] Issue Reported — ${issue.ticketId}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#1D9E75">Issue Reported Successfully</h2>
        <p>Your civic issue has been received and auto-routed.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;background:#f4f6f4;font-weight:600">Ticket ID</td><td style="padding:8px">${issue.ticketId}</td></tr>
          <tr><td style="padding:8px;background:#f4f6f4;font-weight:600">Title</td><td style="padding:8px">${issue.title}</td></tr>
          <tr><td style="padding:8px;background:#f4f6f4;font-weight:600">Department</td><td style="padding:8px">${issue.department}</td></tr>
          <tr><td style="padding:8px;background:#f4f6f4;font-weight:600">Status</td><td style="padding:8px">Pending</td></tr>
        </table>
        <p style="color:#888;font-size:13px;margin-top:16px">You will receive updates as your issue progresses.</p>
      </div>`
  }),
  statusUpdated: (issue, newStatus, message) => ({
    subject: `[CivicPulse] Status Update — ${issue.ticketId}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#1D9E75">Issue Status Updated</h2>
        <p>Your issue <strong>${issue.ticketId}</strong> has a new status.</p>
        <div style="background:#f4f6f4;padding:16px;border-radius:8px">
          <strong>New Status:</strong> ${newStatus.replace('_',' ').toUpperCase()}<br/>
          ${message ? `<strong>Message:</strong> ${message}` : ''}
        </div>
      </div>`
  })
};

exports.sendEmail = async (to, templateKey, data) => {
  if (!process.env.SMTP_USER) return; // skip if not configured
  try {
    const tpl = templates[templateKey](data);
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to, ...tpl
    });
    logger.info(`Email sent to ${to} [${templateKey}]`);
  } catch (err) {
    logger.error(`Email failed: ${err.message}`);
  }
};
