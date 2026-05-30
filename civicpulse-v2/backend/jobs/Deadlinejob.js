/**
 * Deadlinejob.js
 * Runs every hour via node-cron.
 *
 * For every overdue assigned issue:
 *  1. Calculates ₹100/day compensation → deducted from officer (compensationOwed)
 *  2. Adds penalty points to officer
 *  3. Emails the officer about the deduction
 *  4. Emails dept head + all admins as escalation alert
 *
 * Daily at midnight: recalculates accountability scores for all officers.
 */

const cron           = require('node-cron');
const Issue          = require('../models/Issue');
const User           = require('../models/User');
const { sendEmail }  = require('../services/emailService');
const logger         = require('../utils/logger');

// ── Penalty points by delay ───────────────────────────────────
function calcPenaltyPoints(delayDays) {
  if (delayDays >= 3) return 15;
  if (delayDays >= 1) return 5;
  return 0;
}

// ── Fetch dept head + all admins for a department ─────────────
async function getNotifyRecipients(department) {
  const [deptHead, admins] = await Promise.all([
    User.findOne({ role: 'department', isHead: true, department }),
    User.find({ role: 'admin' }, 'name email'),
  ]);
  return { deptHead, admins };
}

// ── Main hourly job ───────────────────────────────────────────
cron.schedule('0 * * * *', async () => {
  logger.info(`[DeadlineJob] Running at ${new Date().toISOString()}`);

  try {
    const now = new Date();
    const today = now.toDateString();

    const overdueIssues = await Issue.find({
      status:     { $nin: ['resolved', 'closed', 'rejected'] },
      deadline:   { $lt: now },
      assignedTo: { $exists: true },
    }).populate('assignedTo', 'name email department isHead compensationOwed');

    logger.info(`[DeadlineJob] ${overdueIssues.length} overdue issue(s) found`);

    for (const issue of overdueIssues) {
      const delayMs   = now - new Date(issue.deadline);
      const delayDays = Math.max(1, Math.floor(delayMs / 86400000));
      const todayComp = delayDays * 100;   // ₹100 × days overdue (running total per issue)
      const penalty   = calcPenaltyPoints(delayDays);

      // Check if we already processed this issue today
      const lastNotif   = issue.notifications?.[issue.notifications.length - 1];
      const alreadyDone = lastNotif && new Date(lastNotif.sentAt).toDateString() === today;

      if (alreadyDone) continue;   // skip — already handled today

      const officer = issue.assignedTo;
      if (!officer) continue;

      // ── 1. Deduct compensation from officer ─────────────────
      // We track the DAILY increment (₹100) not the running total,
      // so we add ₹100 each day the issue stays overdue.
      const dailyDeduction = 100;

      await User.findByIdAndUpdate(officer._id, {
        $inc: {
          compensationOwed: dailyDeduction,
          penaltyPoints:    penalty,
        },
      });

      const newTotalOwed = (officer.compensationOwed || 0) + dailyDeduction;

      // ── 2. Update issue fields ───────────────────────────────
      issue.delayDays            = delayDays;
      issue.compensationAmount   = todayComp;
      issue.penaltyPointsAdded   = (issue.penaltyPointsAdded || 0) + penalty;
      issue.escalationLevel      = delayDays >= 3 ? 2 : delayDays >= 1 ? 1 : 0;

      issue.notifications.push({
        type:    'compensation_deducted',
        message: `Day ${delayDays} overdue — ₹${dailyDeduction} compensation deducted from ${officer.name}. Total owed: ₹${newTotalOwed}.`,
        sentAt:  now,
      });

      // ── 3. Email officer ─────────────────────────────────────
      await sendEmail(officer.email, 'compensationDeducted', {
        officerName: officer.name,
        issue,
        delayDays,
        amount:     dailyDeduction,
        totalOwed:  newTotalOwed,
      });

      logger.info(`[DeadlineJob] Officer ${officer.name} — ₹${dailyDeduction} deducted, +${penalty} penalty pts (${issue.ticketId})`);

      // ── 4. Notify dept head + admins ────────────────────────
      const { deptHead, admins } = await getNotifyRecipients(issue.department);

      const escalationData = {
        issue,
        officerName:  officer.name,
        delayDays,
        amount:       dailyDeduction,
      };

      if (deptHead && deptHead.email !== officer.email) {
        await sendEmail(deptHead.email, 'escalationAlert', {
          ...escalationData,
          recipientName: deptHead.name,
        });
        logger.info(`[DeadlineJob] Dept head ${deptHead.name} notified for ${issue.ticketId}`);
      }

      for (const admin of admins) {
        await sendEmail(admin.email, 'escalationAlert', {
          ...escalationData,
          recipientName: admin.name,
        });
        logger.info(`[DeadlineJob] Admin ${admin.name} notified for ${issue.ticketId}`);
      }

      await issue.save();
    }

    logger.info(`[DeadlineJob] Done — processed ${overdueIssues.length} overdue issue(s)`);

  } catch (err) {
    logger.error(`[DeadlineJob] Error: ${err.message}`);
  }
});

// ── Daily midnight: recalculate accountability scores ─────────
cron.schedule('0 0 * * *', async () => {
  logger.info('[AccountabilityJob] Updating accountability scores...');
  try {
    const since = new Date(Date.now() - 86400000);

    const recentlyResolved = await Issue.find({
      status:     'resolved',
      resolvedAt: { $gte: since, $exists: true },
      assignedTo: { $exists: true },
    });

    for (const issue of recentlyResolved) {
      const onTime = !issue.deadline || issue.resolvedAt <= issue.deadline;
      await User.findByIdAndUpdate(issue.assignedTo, {
        $inc: {
          resolvedOnTime: onTime ? 1 : 0,
          resolvedLate:   onTime ? 0 : 1,
        },
      });
    }

    logger.info(`[AccountabilityJob] Processed ${recentlyResolved.length} resolved issue(s)`);
  } catch (err) {
    logger.error(`[AccountabilityJob] Error: ${err.message}`);
  }
});

logger.info('[DeadlineJob] Cron jobs scheduled (hourly compensation check + daily score update)');