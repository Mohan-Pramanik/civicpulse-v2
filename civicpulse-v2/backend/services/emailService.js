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

// ── NEW templates for deadline compensation & escalation ─────
Object.assign(templates, {

  compensationDeducted: (data) => ({
    subject: `[CivicPulse] ⚠️ Compensation Deducted — ${data.issue.ticketId}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="background:#ef4444;padding:20px 24px">
          <h2 style="color:#fff;margin:0">⚠️ Missed Deadline — Compensation Deducted</h2>
        </div>
        <div style="padding:24px">
          <p>Dear <strong>${data.officerName}</strong>,</p>
          <p>You have missed the resolution deadline for the following issue. A government compensation has been deducted from your account.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#fef2f2"><td style="padding:10px;font-weight:600;width:45%">Ticket ID</td><td style="padding:10px">${data.issue.ticketId}</td></tr>
            <tr><td style="padding:10px;font-weight:600;background:#f9fafb">Issue Title</td><td style="padding:10px">${data.issue.title}</td></tr>
            <tr style="background:#fef2f2"><td style="padding:10px;font-weight:600">Deadline</td><td style="padding:10px">${new Date(data.issue.deadline).toLocaleDateString('en-IN')}</td></tr>
            <tr><td style="padding:10px;font-weight:600;background:#f9fafb">Days Overdue</td><td style="padding:10px;color:#ef4444;font-weight:700">${data.delayDays} day(s)</td></tr>
            <tr style="background:#fef2f2"><td style="padding:10px;font-weight:600">Amount Deducted</td><td style="padding:10px;color:#ef4444;font-weight:700">₹${data.amount.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding:10px;font-weight:600;background:#f9fafb">Total Owed to Govt</td><td style="padding:10px;font-weight:700">₹${data.totalOwed.toLocaleString('en-IN')}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px">Please resolve the issue immediately to stop further deductions. ₹100 will be deducted for every additional day of delay.</p>
        </div>
      </div>`
  }),

  escalationAlert: (data) => ({
    subject: `[CivicPulse] 🚨 ESCALATION ALERT — ${data.issue.ticketId} (${data.delayDays} days overdue)`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="background:#7c3aed;padding:20px 24px">
          <h2 style="color:#fff;margin:0">🚨 Escalation Alert — Deadline Missed</h2>
        </div>
        <div style="padding:24px">
          <p>Dear <strong>${data.recipientName}</strong>,</p>
          <p>A civic issue assigned to your department has breached its deadline and requires immediate attention.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f5f3ff"><td style="padding:10px;font-weight:600;width:45%">Ticket ID</td><td style="padding:10px">${data.issue.ticketId}</td></tr>
            <tr><td style="padding:10px;font-weight:600;background:#f9fafb">Issue Title</td><td style="padding:10px">${data.issue.title}</td></tr>
            <tr style="background:#f5f3ff"><td style="padding:10px;font-weight:600">Assigned Officer</td><td style="padding:10px">${data.officerName}</td></tr>
            <tr><td style="padding:10px;font-weight:600;background:#f9fafb">Department</td><td style="padding:10px">${data.issue.department}</td></tr>
            <tr style="background:#f5f3ff"><td style="padding:10px;font-weight:600">Deadline</td><td style="padding:10px">${new Date(data.issue.deadline).toLocaleDateString('en-IN')}</td></tr>
            <tr><td style="padding:10px;font-weight:600;background:#fef2f2">Days Overdue</td><td style="padding:10px;color:#ef4444;font-weight:700">${data.delayDays} day(s)</td></tr>
            <tr style="background:#fef2f2"><td style="padding:10px;font-weight:600">Compensation Deducted</td><td style="padding:10px;color:#ef4444;font-weight:700">₹${data.amount.toLocaleString('en-IN')}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px">Please take immediate action to resolve or reassign this issue.</p>
        </div>
      </div>`
  }),

});

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