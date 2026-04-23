export interface ScheduleTaskSyncEmailParams {
  memberName: string;
  templateName: string;
  tasks: Array<{
    title: string;
    description: string;
    dueDate: string;
  }>;
  workspaceUrl: string;
}

export const renderScheduleTaskSyncEmail = (params: ScheduleTaskSyncEmailParams): string => {
  const tasksHtml = params.tasks
    .map(
      (task) => `
    <div style="margin: 12px 0; padding: 12px; border-left: 4px solid #3b82f6; background: #f0f9ff;">
      <div style="font-weight: 600; color: #1e40af; margin-bottom: 4px;">${escapeHtml(task.title)}</div>
      <div style="font-size: 14px; color: #475569; margin-bottom: 4px;">${escapeHtml(task.description)}</div>
      <div style="font-size: 13px; color: #64748b;">Due: ${formatDate(task.dueDate)}</div>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
    .button { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Your Daily Tasks</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Schedule: ${escapeHtml(params.templateName)}</p>
    </div>

    <div class="content">
      <p>Hi ${escapeHtml(params.memberName)},</p>
      <p>Here are your assigned tasks for today based on your schedule:</p>

      ${tasksHtml}

      <p style="margin-top: 20px;">
        <a href="${escapeHtml(params.workspaceUrl)}/app/tasks" class="button">View All Tasks</a>
      </p>

      <div style="margin-top: 20px; padding: 16px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; color: #92400e;">
        <strong style="display: block; margin-bottom: 8px;">⏰ Reminder: Complete by 11:59 PM today</strong>
        <p style="margin: 0; font-size: 14px;">Please complete all assigned tasks before the end of today to stay on schedule.</p>
      </div>

      <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
        These tasks were automatically created from your schedule template. You can accept, decline, or mark them in progress in the Tasks section.
      </p>
    </div>

    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
};

const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};
