# ReadyCompliant Signing Tools

These tools implement the **local-only signing** security model for RiteDoc cartridge updates.

## Security Model

The private signing key **never leaves Aroha** (Marita's laptop). The trust chain is:

```
Aroha signs locally → .rsp package → Dashboard uploads → R2 stores → RiteDoc app verifies
```

Even if the Cloudflare account is compromised, an attacker cannot push fake regulation updates because they don't have the private key.

## Tools

### `generate_keys.js` — Generate Ed25519 Key Pair

Run **once** on Aroha to create the signing key pair.

```bash
cd tools/
node generate_keys.js
```

This creates two files in the current directory:
- `ritedoc_signing_key.pem` — **Private key** (hex-encoded). Keep this secret.
- `ritedoc_signing_key.pub` — **Public key** (hex-encoded). This is safe to share.

**After running:**
1. Back up `ritedoc_signing_key.pem` to an encrypted USB drive and your password manager
2. Copy the public key hex into `worker/wrangler.toml` → `PUBLIC_KEY_HEX`
3. Compile the public key hex into the RiteDoc app's `regulation_sync.rs`
4. **Never** commit `ritedoc_signing_key.pem` to Git

### `sign_cartridge.js` — Create a Signed Cartridge Package

Run on Aroha whenever you have a new cartridge update ready to deploy.

```bash
node sign_cartridge.js <cartridge_dir> <private_key_path> <version> [release_notes]
```

**Example:**
```bash
node sign_cartridge.js ~/cartridge-v2.1.0/ ./ritedoc_signing_key.pem 2.1.0 "Updated red flags for NDIS 2026"
```

**Input:** A directory containing the cartridge JSON files:
- `red_flags_v2.json`
- `rubric_v2.json`
- `policies.json`
- `system_prompts.json`

**Output:** `cartridge_2_1_0.rsp` — a JSON package containing:
```json
{
  "manifest": {
    "version": "2.1.0",
    "timestamp": "2026-04-16T...",
    "release_notes": "Updated red flags for NDIS 2026",
    "files": [
      { "name": "red_flags_v2.json", "hash": "<sha256>", "size": 12345 }
    ]
  },
  "signature": "<hex Ed25519 signature of the manifest>",
  "files": {
    "red_flags_v2.json": "<base64 file content>"
  }
}
```

**Then:** Upload the `.rsp` file through the ReadyCompliant Admin Dashboard → Cartridges section.

## Workflow

```
1. Update cartridge JSON files locally on Aroha
2. Run: node sign_cartridge.js ./my-cartridge/ ./ritedoc_signing_key.pem 2.1.0 "Release notes"
3. Log into dashboard.readycompliant.com
4. Go to Cartridges → Upload Package
5. Select the .rsp file → Upload
6. Worker verifies signature using PUBLIC_KEY_HEX
7. Package stored in R2 (or D1 metadata if R2 not yet enabled)
8. RiteDoc app downloads and verifies signature on next sync
```

## Key Locations

| Key | Location | Who has it |
|-----|----------|------------|
| Private key | `~/ritedoc_signing_key.pem` on Aroha + encrypted USB backup | Marita only |
| Public key | `worker/wrangler.toml` → `PUBLIC_KEY_HEX` | Cloudflare Worker |
| Public key | `src-tauri/src/regulation_sync.rs` → compiled in binary | RiteDoc app |

## Dependencies

```bash
cd tools/
pnpm install
```

Requires: `tweetnacl` (already in package.json)
