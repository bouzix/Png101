const net = require('net');

const port = 3306;
const host = '127.0.0.1';

const client = new net.Socket();

console.log(`Checking connection to ${host}:${port}...`);

client.connect(port, host, () => {
    console.log(`Successfully connected to ${host}:${port}`);
    client.destroy();
});

client.on('error', (err) => {
    console.error(`Connection failed: ${err.message}`);
});

client.on('close', () => {
    console.log('Connection closed');
});
