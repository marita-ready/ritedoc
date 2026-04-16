const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');

function generateKeys() {
    const keyPair = nacl.sign.keyPair();
    const privateKey = Buffer.from(keyPair.secretKey).toString('hex');
    const publicKey = Buffer.from(keyPair.publicKey).toString('hex');

    const privateKeyPath = path.join(process.cwd(), 'ritedoc_signing_key.pem');
    const publicKeyPath = path.join(process.cwd(), 'ritedoc_signing_key.pub');

    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);

    console.log('Ed25519 Key Pair Generated Successfully!');
    console.log('----------------------------------------');
    console.log(`Private Key saved to: ${privateKeyPath}`);
    console.log(`Public Key saved to:  ${publicKeyPath}`);
    console.log('----------------------------------------');
    console.log('INSTRUCTIONS:');
    console.log('1. Store the private key (.pem) on your laptop (Aroha) and back it up to an encrypted USB drive and your password manager.');
    console.log('2. NEVER upload the private key to any server.');
    console.log('3. The public key (.pub) is compiled into the RiteDoc binary and used by the Cloudflare Worker for verification.');
    console.log('----------------------------------------');
    console.log(`Public Key (Hex): ${publicKey}`);
}

generateKeys();
