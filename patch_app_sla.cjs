const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the two setRequests(data.requests) calls inside reloadData to use serverConfig
appCode = appCode.replace(/setRequests\(data\.requests\);\s*\}\s*\}\)\s*\.catch\(console\.error\);\s*\} else \{/g, `setRequests(recalculateAllSLAs(data.requests, serverConfig));
          }
        })
        .catch(console.error);
    } else {`);

appCode = appCode.replace(/setRequests\(data\.requests\);\s*\}\s*\}\)\s*\.catch\(console\.error\);\s*\}/g, `setRequests(recalculateAllSLAs(data.requests, serverConfig));
          }
        })
        .catch(console.error);
    }`);

fs.writeFileSync('src/App.tsx', appCode);
console.log('App.tsx SLA patched');
