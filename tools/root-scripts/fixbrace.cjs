const fs = require('fs');
let content = fs.readFileSync('client/App.tsx', 'utf8');

// The replacement that failed earlier probably had an issue, let's fix it safely via regex
content = content.replace(/<\/QueryClientProvider>[\r\n]+\);/, '</QueryClientProvider>\n  );\n};');

fs.writeFileSync('client/App.tsx', content);
console.log('Fixed App.tsx closing braces');
