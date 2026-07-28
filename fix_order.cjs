const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
  'Left Column: Intake details, identity, completeness checks */}\n                  <div className="lg:col-span-2 space-y-6">',
  'Left Column: Intake details, identity, completeness checks */}\n                  <div className="lg:col-span-2 space-y-6 flex flex-col">'
);

c = c.replace(
  'Module 0: Data Subject & Requester Profile Card */}\n                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">',
  'Module 0: Data Subject & Requester Profile Card */}\n                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 order-1">'
);

c = c.replace(
  'General Request Metadata */}\n                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">',
  'General Request Metadata */}\n                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 order-2">'
);

c = c.replace(
  `{/* Module A: Identity & Completeness verification (INTAKE ROLE) */}\n                    {['intake', 'admin', 'dpo'].includes(activeUser.role) && (\n                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">`,
  `{/* Module A: Identity & Completeness verification (INTAKE ROLE) */}\n                    {['intake', 'admin'].includes(activeUser.role) && (\n                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 order-3">`
);

c = c.replace(
  `{/* Staff Direct Message Board with Citizen */}\n                    {['intake', 'admin', 'dpo', 'owner'].includes(activeUser.role) && (\n                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[400px]">`,
  `{/* Staff Direct Message Board with Citizen */}\n                    {['intake', 'admin', 'dpo', 'owner'].includes(activeUser.role) && (\n                      <div className={"bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[400px] " + (activeUser.role === 'dpo' ? 'order-5' : 'order-6')}>`
);

c = c.replace(
  `{/* Close Request and Delivery management */}\n                    {['intake', 'admin'].includes(activeUser.role) && activeRequestObj.status === 'Ready for Delivery' && (\n                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">`,
  `{/* Close Request and Delivery management */}\n                    {['intake', 'admin'].includes(activeUser.role) && activeRequestObj.status === 'Ready for Delivery' && (\n                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 order-last">`
);

c = c.replace(
  `{/* Module B: Data Gathering Tasking (Section 3.5) */}\n                    {['owner', 'admin', 'intake', 'dpo'].includes(activeUser.role) && (\n                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">`,
  `{/* Module B: Data Gathering Tasking (Section 3.5) */}\n                    {['owner', 'admin', 'intake', 'dpo'].includes(activeUser.role) && (\n                      <div className={"bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 " + (activeUser.role === 'dpo' ? 'order-6' : 'order-4')}>`
);

c = c.replace(
  `{/* Module C: Document Redaction Panel (DPO/LEGAL ROLE) */}\n                    {['dpo', 'admin'].includes(activeUser.role) && (\n                      <div className="space-y-4">`,
  `{/* Module C: Document Redaction Panel (DPO/LEGAL ROLE) */}\n                    {['dpo', 'admin'].includes(activeUser.role) && (\n                      <div className={"space-y-4 " + (activeUser.role === 'dpo' ? 'order-4' : 'order-5')}>`
);

fs.writeFileSync('src/App.tsx', c);
console.log('App.tsx updated successfully');
