#!/usr/bin/env node
/**
 * bmc-sign.js — Genera la firma HMAC-SHA256 para llamadas manuales al webhook de BMC.
 *
 * Uso (desde el directorio admin-service):
 *   node scripts/bmc-sign.js '<json-body>'
 *   node scripts/bmc-sign.js --pretty '<json-body>'
 *
 * O pasando un fichero:
 *   cat payload.json | node scripts/bmc-sign.js
 *
 * Requiere: BMC_WEBHOOK_SECRET en el .env del admin-service (o en la variable de entorno).
 *
 * Salida:
 *   x-signature-sha256: <hex>
 *   Body (pega en Postman → raw → JSON): <json>
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Cargar .env automáticamente ───────────────────────────────────────────────
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!(key in process.env)) process.env[key] = val;
    }
}

// ── Leer el body ──────────────────────────────────────────────────────────────
const pretty = process.argv.includes('--pretty');
const args = process.argv.slice(2).filter(a => a !== '--pretty');

let rawBody;

if (args.length > 0) {
    rawBody = args[0];
} else if (!process.stdin.isTTY) {
    rawBody = fs.readFileSync('/dev/stdin', 'utf8').trim();
} else {
    // Interactive mode: show examples
    const now = Math.floor(Date.now() / 1000);
    const examples = {
        'membership.started': {
            type: 'membership.started',
            event_id: 'evt-manual-001',
            data: {
                membership_id: 'bmc-membership-001',
                payer_email: 'member@example.com',
                started_at: now,
            },
        },
        'membership.cancelled': {
            type: 'membership.cancelled',
            event_id: 'evt-manual-002',
            data: {
                membership_id: 'bmc-membership-001',
                payer_email: 'member@example.com',
                cancelled_at: now,
            },
        },
        'membership.updated': {
            type: 'membership.updated',
            event_id: 'evt-manual-003',
            data: {
                membership_id: 'bmc-membership-001',
                payer_email: 'member@example.com',
                next_billing_date: now + 2592000,
                last_payment_date: now,
            },
        },
    };

    console.error('No se proporcionó body. Pasa el JSON como argumento o usa pipe.\n');
    console.error('Ejemplos de uso:\n');
    for (const [name, payload] of Object.entries(examples)) {
        console.error(`  # ${name}`);
        console.error(`  node scripts/bmc-sign.js --pretty '${JSON.stringify(payload)}'\n`);
    }
    process.exit(1);
}

// ── Validate JSON ──────────────────────────────────────────────────────────────
let parsed;
try {
    parsed = JSON.parse(rawBody);
} catch {
    console.error('❌  Invalid JSON.');
    process.exit(1);
}

// ── Validate secret ────────────────────────────────────────────────────────────
const secret = process.env.BMC_WEBHOOK_SECRET;
if (!secret) {
    console.error('❌  BMC_WEBHOOK_SECRET is not defined. Check .env');
    process.exit(1);
}

// ── Calculate signature (same as controller) ──────────────────────────────────
// Always use the minified form of JSON (without extra spaces)
const bodyStr = JSON.stringify(parsed);
const signature = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

// ── Show result ─────────────────────────────────────────────────────────
if (pretty) {
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  🔐  BMC Webhook — Firma HMAC-SHA256');
    console.log('══════════════════════════════════════════════════════════');
    console.log('\n  Cabecera (Header) para Postman:');
    console.log(`    Nombre : x-signature-sha256`);
    console.log(`    Valor  : ${signature}`);
    console.log('\n  Body (pega en Postman → Body → raw → JSON):');
    console.log(`    ${bodyStr}`);
    console.log('\n══════════════════════════════════════════════════════════\n');
} else {
    console.log(`signature=${signature}`);
    console.log(`body=${bodyStr}`);
}
