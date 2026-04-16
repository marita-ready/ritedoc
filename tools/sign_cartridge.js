const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function signCartridge(cartridgeDir, privateKeyPath, version, releaseNotes) {
    if (!fs.existsSync(cartridgeDir)) {
        console.error(`Error: Cartridge directory not found: ${cartridgeDir}`);
        process.exit(1);
    }

    if (!fs.existsSync(privateKeyPath)) {
        console.error(`Error: Private key file not found: ${privateKeyPath}`);
        process.exit(1);
    }

    const privateKeyHex = fs.readFileSync(privateKeyPath, 'utf8').trim();
    const privateKey = Buffer.from(privateKeyHex, 'hex');

    const files = fs.readdirSync(cartridgeDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
        console.error(`Error: No JSON files found in ${cartridgeDir}`);
        process.exit(1);
    }

    const manifest = {
        version: version,
        timestamp: new Date().toISOString(),
        release_notes: releaseNotes || '',
        files: []
    };

    for (const file of files) {
        const filePath = path.join(cartridgeDir, file);
        const content = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        manifest.files.push({
            name: file,
            hash: hash,
            size: content.length
        });
    }

    const manifestString = JSON.stringify(manifest, null, 2);
    const manifestBuffer = Buffer.from(manifestString);
    const signature = nacl.sign.detached(manifestBuffer, privateKey);
    const signatureHex = Buffer.from(signature).toString('hex');

    const rsp = {
        manifest: manifest,
        signature: signatureHex,
        files: {}
    };

    for (const file of files) {
        const filePath = path.join(cartridgeDir, file);
        rsp.files[file] = fs.readFileSync(filePath).toString('base64');
    }

    const outputFileName = `cartridge_${version.replace(/\./g, '_')}.rsp`;
    const outputPath = path.join(process.cwd(), outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(rsp, null, 2));

    console.log(`Regulation Sync Package (RSP) created: ${outputPath}`);
    console.log(`Version: ${version}`);
    console.log(`Files included: ${files.length}`);
    console.log(`Signature: ${signatureHex.substring(0, 16)}...`);
    console.log('----------------------------------------');
    console.log('Upload this .rsp file through the ReadyCompliant Admin Dashboard.');
}

const args = process.argv.slice(2);
if (args.length < 3) {
    console.log('Usage: node sign_cartridge.js <cartridge_dir> <private_key_path> <version> [release_notes]');
    console.log('Example: node sign_cartridge.js ./v2.1.0 ./ritedoc_signing_key.pem 2.1.0 "Updated red flags for NDIS 2026"');
    process.exit(1);
}

signCartridge(args[0], args[1], args[2], args[3] || '');
