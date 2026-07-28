import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new email fetching block
new_email_block = """  // Define default fallback officer email addresses per role
  let intakeEmails = [process.env.INTAKE_EMAIL || 'youtub6.numcom@gmail.com'];
  let ownerEmails = [process.env.OWNER_EMAIL || 'youtub6.numcom@gmail.com'];
  let dpoEmails = [process.env.DPO_EMAIL || 'youtub6.numcom@gmail.com'];
  let approverEmails = [process.env.APPROVER_EMAIL || 'youtub6.numcom@gmail.com'];

  // Dynamically fetch actual emails from database based on orgId and role
  if (request.orgId) {
    try {
      const { rows: officers } = await dbPool.query(
        "SELECT role, email FROM users WHERE org_id = $1 AND email IS NOT NULL AND email != ''",
        [request.orgId]
      );
      
      const intakes = officers.filter(o => o.role === 'intake').map(o => o.email);
      if (intakes.length > 0) intakeEmails = intakes;
      
      const owners = officers.filter(o => o.role === 'owner').map(o => o.email);
      if (owners.length > 0) ownerEmails = owners;
      
      const dpos = officers.filter(o => o.role === 'dpo').map(o => o.email);
      if (dpos.length > 0) dpoEmails = dpos;
      
      const approvers = officers.filter(o => o.role === 'approver').map(o => o.email);
      if (approvers.length > 0) approverEmails = approvers;
    } catch (err) {
      console.error('Error fetching officer emails for notification:', err.message);
    }
  }

  const recipients = [];
  
  // Helper to add multiple officers of the same role
  const addRecipients = (emails, roleName, actionRequired) => {
    emails.forEach(email => {
      if (email && !recipients.find(r => r.email === email)) {
        recipients.push({ email, roleName, actionRequired });
      }
    });
  };

  let subject = '';
  let flowMessageTh = '';
  let nextActionTh = '';"""

# Regex replacement for the declaration block
content = re.sub(
    r"  // Define default officer email addresses per role.*?let nextActionTh = '';",
    new_email_block,
    content,
    flags=re.DOTALL
)

# Now we replace recipients.push({ email: xxxEmail, ... }) with addRecipients(xxxEmails, ...)
content = re.sub(
    r"recipients\.push\(\{ email: (intake|owner|dpo|approver)Email,\s*roleName:\s*('[^']+'),\s*actionRequired:\s*('[^']+')\s*\}\);",
    r"addRecipients(\1Emails, \2, \3);",
    content
)

# Replace citizen push
content = re.sub(
    r"recipients\.push\(\{ email: citizenEmail,\s*roleName:\s*('[^']+'),\s*actionRequired:\s*('[^']+')\s*\}\);",
    r"addRecipients([citizenEmail], \1, \2);",
    content
)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored sendWorkflowNotification in server.js")
