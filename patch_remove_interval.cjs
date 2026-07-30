const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const targetToReplace = `  useEffect(() => {
    // SLA calculation requires both requests and config to be loaded
    if (requests.length > 0 && config) {
      const updated = recalculateAllSLAs(requests, config);
      // We don't call setRequests(updated) continuously to avoid loops, 
      // SLA should be updated mostly on server or on explicit fetch.
      // For now, optimistic update is sufficient.
    }
    const interval = setInterval(() => {
      // SLA calculation requires both requests and config to be loaded
    if (requests.length > 0 && config) {
      const updated = recalculateAllSLAs(requests, config);
      // We don't call setRequests(updated) continuously to avoid loops, 
      // SLA should be updated mostly on server or on explicit fetch.
      // For now, optimistic update is sufficient.
    }
      reloadData();
    }, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);`;

appCode = appCode.replace(targetToReplace, `  useEffect(() => {
    // SLA calculation is now applied during reloadData() fetches.
    // The previous standalone interval here has been removed to avoid stale state and loops.
  }, []);`);

fs.writeFileSync('src/App.tsx', appCode);
console.log('Interval patched');
