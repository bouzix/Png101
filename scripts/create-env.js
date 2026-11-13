const fs = require('fs');
fs.writeFileSync('.env', 'DATABASE_URL="mysql://root:@localhost:3306/png_finder"');
console.log('.env created');
