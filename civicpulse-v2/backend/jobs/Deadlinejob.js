/**
 * deadlineJob.js
 * Runs every hour via node-cron.
 * Checks all non-resolved issues for overdue status,
 * applies penalty points, calculates compensation,
 * and escalates if needed.
 *
 * Install: npm install node-cron
 * Import in server.js: require('./jobs/deadlineJob');
 */

const cron  = require('node-cron');
const Issue = require('../models/Issue');
const User  = require('../models/User');

// ── Penalty rules ─────────────────────────────────────────────
function calcPenaltyPoints(delayDays) {
  if (delayDays >= 3) return 15;
  if (delayDays >= 1) return 5;
  return 0;
}

// ── Main job — runs every hour ────────────────────────────────
cron.schedule('0 * * * *', async () => {
  console.log(`[DeadlineJob] Running at ${new Date().toISOString()}`);

  try {
    const now = new Date();

    // Find all non-resolved issues that have a deadline in the past
    const overdueIssues = await Issue.find({
      status:   { $nin: ['resolved', 'closed', 'rejected'] },
      deadline: { $lt: now },
      assignedTo: { $exists: true }
    }).populate('assignedTo', 'name email department isHead');

    console.log(`[DeadlineJob] Found ${overdueIssues.length} overdue issues`);

    for (const issue of overdueIssues) {
      const delayMs   = now - issue.deadline;
      const delayDays = Math.floor(delayMs / 86400000); // ms → days
      const penalty   = calcPenaltyPoints(delayDays);
      const compensation = delayDays * 100; // ₹100 per day suggestion

      // ── Update issue with penalty & compensation ─────────────
      issue.delayDays          = delayDays;
      issue.compensationAmount = compensation;

      // Only add penalty points once per day (check if already added today)
      const today       = now.toDateString();
      const lastNotif   = issue.notifications?.[issue.notifications.length - 1];
      const alreadyDone = lastNotif && new Date(lastNotif.sentAt).toDateString() === today;

      if (!alreadyDone && penalty > 0 && issue.assignedTo) {
        // Add penalty to officer
        await User.findByIdAndUpdate(issue.assignedTo._id, {
          $inc: { penaltyPoints: penalty }
        });
        issue.penaltyPointsAdded = (issue.penaltyPointsAdded || 0) + penalty;

        // Log notification for officer
        issue.notifications.push({
          type:    'overdue_officer',
          message: `Issue ${issue.ticketId} is ${delayDays} day(s) overdue. ${penalty} penalty points added to officer ${issue.assignedTo.name}.`
        });

        console.log(`[DeadlineJob] Officer ${issue.assignedTo.name} → +${penalty} penalty points for ${issue.ticketId}`);
      }

      // ── Escalation: if delay > 2 days → notify head/admin ────
      if (delayDays > 2 && issue.escalationLevel < 2) {
        issue.escalationLevel = 2;
        issue.notifications.push({
          type:    'escalate_head',
          message: `ESCALATED: Issue ${issue.ticketId} is ${delayDays} days overdue. Notifying department head and admin.`
        });

        // In production: send email here
        // sendEmail(deptHead.email, 'escalation', issue);
        console.log(`[DeadlineJob] ESCALATED ${issue.ticketId} — ${delayDays} days overdue`);

      } else if (delayDays > 0 && issue.escalationLevel < 1) {
        issue.escalationLevel = 1;
        issue.notifications.push({
          type:    'overdue_officer',
          message: `REMINDER: Issue ${issue.ticketId} is ${delayDays} day(s) overdue.`
        });
        console.log(`[DeadlineJob] Reminded officer for ${issue.ticketId}`);
      }

      await issue.save();
    }

    console.log(`[DeadlineJob] Done. Processed ${overdueIssues.length} overdue issues.`);

  } catch (err) {
    console.error(`[DeadlineJob] Error: ${err.message}`);
  }
});

// ── Accountability score updater — runs daily at midnight ─────
cron.schedule('0 0 * * *', async () => {
  console.log('[AccountabilityJob] Updating accountability scores...');
  try {
    // For every resolved issue, update resolvedOnTime or resolvedLate on officer
    const recentlyResolved = await Issue.find({
      status:    'resolved',
      resolvedAt: { $exists: true },
      assignedTo: { $exists: true },
      // Only process issues resolved in last 24 hours
      resolvedAt: { $gte: new Date(Date.now() - 86400000) }
    });

    for (const issue of recentlyResolved) {
      const onTime = !issue.deadline || issue.resolvedAt <= issue.deadline;
      await User.findByIdAndUpdate(issue.assignedTo, {
        $inc: {
          totalAssigned:  0,        // already incremented at assignment
          resolvedOnTime: onTime ? 1 : 0,
          resolvedLate:   onTime ? 0 : 1,
        }
      });
    }
    console.log('[AccountabilityJob] Done.');
  } catch (err) {
    console.error(`[AccountabilityJob] Error: ${err.message}`);
  }
});

console.log('[DeadlineJob] Cron jobs scheduled.');