const fs = require('fs');
let code = fs.readFileSync('src/db.ts', 'utf-8');

// Fix 1: changeRequestStatus async
const target1 = `export const changeRequestStatus = (
  requestId: string,
  newStatus: RequestStatus,
  actor: User,
  comment?: string
) => {`;
const replace1 = `export const changeRequestStatus = async (
  requestId: string,
  newStatus: RequestStatus,
  actor: User,
  comment?: string
) => {`;

// Fix 2: await updateRequest inside changeRequestStatus
const target2 = `  updateRequest(req, actor, 'UPDATE_STATUS', \`เปลี่ยนสถานะคำขอจาก "\${prevStatus}" เป็น "\${newStatus}"\${comment ? \` (ความเห็น: \${comment})\` : ''}\`);`;
const replace2 = `  await updateRequest(req, actor, 'UPDATE_STATUS', \`เปลี่ยนสถานะคำขอจาก "\${prevStatus}" เป็น "\${newStatus}"\${comment ? \` (ความเห็น: \${comment})\` : ''}\`);`;

code = code.replace(target1, replace1).replace(target2, replace2);

fs.writeFileSync('src/db.ts', code);
console.log('Fixed db.ts');
