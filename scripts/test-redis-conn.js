import net from 'net';

const host = '69.62.77.8';
const port = 5432;

console.log(`Testing TCP connection to ${host}:${port}...`);

const socket = new net.Socket();
socket.setTimeout(8000); // Increased timeout to 8s

socket.on('connect', () => {
    console.log('✅ Connection successful!');
    socket.destroy();
});

socket.on('timeout', () => {
    console.log('❌ Connection timed out');
    socket.destroy();
});

socket.on('error', (err) => {
    console.log(`❌ Connection failed: ${err.message}`);
});

socket.connect(port, host);
