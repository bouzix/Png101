const fs = require('fs');
fs.writeFileSync('.env', 'DATABASE_URL="mysql://root:@127.0.0.1:3306/png_finder"');
console.log('.env updated to 127.0.0.1');
