const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replacements
code = code.replace(
  /changeRequestStatus\(reqId, 'Withdrawn'/g,
  "await changeRequestStatus(reqId, 'Withdrawn'"
);
code = code.replace(
  /changeRequestStatus\(trackedRequest.id, 'Completeness Review'/g,
  "await changeRequestStatus(trackedRequest.id, 'Completeness Review'"
);
code = code.replace(
  /changeRequestStatus\(downloadRequest.id, 'Delivered'/g,
  "await changeRequestStatus(downloadRequest.id, 'Delivered'"
);
code = code.replace(
  /changeRequestStatus\(reqId, 'Ready for Delivery'/g,
  "await changeRequestStatus(reqId, 'Ready for Delivery'"
);
code = code.replace(
  /changeRequestStatus\(reqId, resultStatus/g,
  "await changeRequestStatus(reqId, resultStatus"
);
code = code.replace(
  /changeRequestStatus\(reqId, 'Fee Notification'/g,
  "await changeRequestStatus(reqId, 'Fee Notification'"
);
code = code.replace(
  /changeRequestStatus\(reqId, 'Delivered'/g,
  "await changeRequestStatus(reqId, 'Delivered'"
);
code = code.replace(
  /changeRequestStatus\(reqId, 'Closed'/g,
  "await changeRequestStatus(reqId, 'Closed'"
);

// For inline onClick
code = code.replace(
  /onClick=\{\(\) => changeRequestStatus\(activeRequestObj\.id, 'Closed'/g,
  "onClick={async () => await changeRequestStatus(activeRequestObj.id, 'Closed'"
);
code = code.replace(
  /onClick=\{\(\) => changeRequestStatus\(activeRequestObj\.id, 'DPO or Legal Review'/g,
  "onClick={async () => await changeRequestStatus(activeRequestObj.id, 'DPO or Legal Review'"
);

// We also need to make sure handleApproveSubmit etc are async
code = code.replace(
  /const handleWithdrawRequest = \(reqId: string, reason: string\) => {/g,
  "const handleWithdrawRequest = async (reqId: string, reason: string) => {"
);
code = code.replace(
  /const handleMarkAsDelivered = \(reqId: string\) => {/g,
  "const handleMarkAsDelivered = async (reqId: string) => {"
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed App.tsx part 2');
