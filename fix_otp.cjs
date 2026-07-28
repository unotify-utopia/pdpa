const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `    const isValid = await verifyRealOtp(trackedRequest.requester.email, trackedRequest.requester.phone, submittedOtp, trackedRequest.trackingNo);
    if (isValid) {
      setShowOtpModal(false);
      setView('tracking');
    }`;

const replaceStr = `    const isValid = await verifyRealOtp(trackedRequest.requester.email, trackedRequest.requester.phone, submittedOtp, trackedRequest.trackingNo);
    if (isValid) {
      try {
        const res = await fetch('/api/public/requests');
        const data = await res.json();
        if (data.success && data.requests) {
           const fullReq = data.requests.find((r) => r.trackingNo === trackedRequest.trackingNo);
           if (fullReq) {
              setTrackedRequest(fullReq);
           }
        }
      } catch (err) {
        console.error('Failed to fetch full request data:', err);
      }
      
      setShowOtpModal(false);
      setView('tracking');
    }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed handleVerifyOtp');
