const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
  '<RedactionCanvas\n                          onRedactApplied={(record) => handleRedactionApplied(activeRequestObj.id, record)}\n                          onSaveAll={() => handleSaveRedactionAll(activeRequestObj.id)}\n                        />',
  '<RedactionCanvas\n                          request={activeRequestObj}\n                          onRedactApplied={(record) => handleRedactionApplied(activeRequestObj.id, record)}\n                          onSaveAll={() => handleSaveRedactionAll(activeRequestObj.id)}\n                        />'
);

fs.writeFileSync('src/App.tsx', c);
console.log('App.tsx updated successfully for RedactionCanvas request prop');
