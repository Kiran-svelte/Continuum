/**
 * Cloudflare Setup Script
 * 
 * Configures DNS records and firewall rules for Continuum.
 * 
 * Before running:
 * 1. Set CLOUDFLARE_API_TOKEN in .env (already done)
 * 2. Set CLOUDFLARE_ZONE_ID in .env
 * 3. Set CLOUDFLARE_ACCOUNT_ID in .env
 * 
 * Run with: npx tsx scripts/setup-cloudflare.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

const BASE_URL = 'https://api.cloudflare.com/client/v4';

interface CFResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

async function cfFetch<T>(endpoint: string, options: RequestInit = {}): Promise<CFResponse<T>> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res.json() as Promise<CFResponse<T>>;
}

// ─── DNS Configuration ───────────────────────────────────────────────────────

async function setupDNS(domain: string, serverIP: string) {
  console.log('\n📝 Setting up DNS records...\n');

  const records = [
    { type: 'A', name: domain, content: serverIP, proxied: true },
    { type: 'A', name: 'www', content: serverIP, proxied: true },
    { type: 'A', name: 'api', content: serverIP, proxied: true },
  ];

  for (const record of records) {
    // Check if record exists
    const existing = await cfFetch<any[]>(`/zones/${ZONE_ID}/dns_records?type=${record.type}&name=${record.name}.${domain}`);
    
    if (existing.success && existing.result.length > 0) {
      // Update existing record
      const id = existing.result[0].id;
      const res = await cfFetch(`/zones/${ZONE_ID}/dns_records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(record),
      });
      if (res.success) {
        console.log(`  ✅ Updated: ${record.name}.${domain} -> ${serverIP}`);
      } else {
        console.log(`  ❌ Failed to update ${record.name}: ${res.errors[0]?.message}`);
      }
    } else {
      // Create new record
      const res = await cfFetch(`/zones/${ZONE_ID}/dns_records`, {
        method: 'POST',
        body: JSON.stringify(record),
      });
      if (res.success) {
        console.log(`  ✅ Created: ${record.name}.${domain} -> ${serverIP}`);
      } else {
        console.log(`  ❌ Failed to create ${record.name}: ${res.errors[0]?.message}`);
      }
    }
  }
}

// ─── Firewall Rules ──────────────────────────────────────────────────────────

async function setupFirewallRules() {
  console.log('\n🔥 Setting up Firewall Rules...\n');

  // Create custom firewall rules using Ruleset API
  const securityRules = [
    {
      description: 'Block SQL Injection Attempts',
      expression: '(http.request.uri.query contains "UNION" and http.request.uri.query contains "SELECT") or http.request.uri.query contains "--" or http.request.uri.query contains "DROP TABLE"',
      action: 'block',
    },
    {
      description: 'Block XSS Attacks',
      expression: 'http.request.uri.query contains "<script" or http.request.uri.path contains "<script"',
      action: 'block',
    },
    {
      description: 'Challenge Suspicious Countries',
      expression: 'ip.geoip.country in {"RU" "CN" "KP"} and not cf.client.bot',
      action: 'managed_challenge',
    },
    {
      description: 'Rate Limit Auth Endpoints',
      expression: 'http.request.uri.path contains "/api/auth" and http.request.method eq "POST"',
      action: 'managed_challenge',
    },
    {
      description: 'Block Known Bad Bots',
      expression: 'cf.bot_management.score lt 30 and not cf.bot_management.verified_bot',
      action: 'block',
    },
  ];

  // Get existing custom ruleset
  const rulesets = await cfFetch<any[]>(`/zones/${ZONE_ID}/rulesets?phase=http_request_firewall_custom`);
  
  let rulesetId: string;
  
  if (rulesets.success && rulesets.result.length > 0) {
    rulesetId = rulesets.result[0].id;
    console.log(`  Found existing ruleset: ${rulesetId}`);
  } else {
    // Create new ruleset
    const create = await cfFetch<any>(`/zones/${ZONE_ID}/rulesets`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Continuum Security Rules',
        description: 'Custom security rules for Continuum application',
        kind: 'zone',
        phase: 'http_request_firewall_custom',
        rules: securityRules.map((r, i) => ({
          ...r,
          enabled: true,
          position: { index: i + 1 },
        })),
      }),
    });
    
    if (create.success) {
      console.log('  ✅ Created security ruleset');
      rulesetId = create.result.id;
    } else {
      console.log(`  ❌ Failed to create ruleset: ${create.errors[0]?.message}`);
      return;
    }
  }

  console.log('\n  Security rules configured:');
  securityRules.forEach(r => console.log(`    - ${r.description}`));
}

// ─── Enable Security Settings ────────────────────────────────────────────────

async function enableSecuritySettings() {
  console.log('\n🛡️ Enabling Security Settings...\n');

  // Enable SSL/TLS
  const ssl = await cfFetch(`/zones/${ZONE_ID}/settings/ssl`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'full_strict' }),
  });
  console.log(`  SSL Mode: ${ssl.success ? '✅ Full (Strict)' : '❌ Failed'}`);

  // Enable Always Use HTTPS
  const https = await cfFetch(`/zones/${ZONE_ID}/settings/always_use_https`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'on' }),
  });
  console.log(`  Always HTTPS: ${https.success ? '✅ Enabled' : '❌ Failed'}`);

  // Enable TLS 1.3
  const tls13 = await cfFetch(`/zones/${ZONE_ID}/settings/min_tls_version`, {
    method: 'PATCH',
    body: JSON.stringify({ value: '1.2' }),
  });
  console.log(`  Min TLS Version: ${tls13.success ? '✅ 1.2' : '❌ Failed'}`);

  // Enable WAF
  const waf = await cfFetch(`/zones/${ZONE_ID}/settings/waf`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'on' }),
  });
  console.log(`  WAF: ${waf.success ? '✅ Enabled' : '❌ Failed'}`);

  // Enable Bot Fight Mode
  const bot = await cfFetch(`/zones/${ZONE_ID}/settings/bot_fight_mode`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'on' }),
  });
  console.log(`  Bot Fight Mode: ${bot.success ? '✅ Enabled' : '❌ Failed'}`);

  // Security Level
  const secLevel = await cfFetch(`/zones/${ZONE_ID}/settings/security_level`, {
    method: 'PATCH',
    body: JSON.stringify({ value: 'high' }),
  });
  console.log(`  Security Level: ${secLevel.success ? '✅ High' : '❌ Failed'}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CLOUDFLARE SETUP FOR CONTINUUM');
  console.log('='.repeat(60));

  // Validate credentials
  if (!API_TOKEN) {
    console.error('\n❌ Missing CLOUDFLARE_API_TOKEN in .env');
    process.exit(1);
  }
  if (!ZONE_ID) {
    console.error('\n❌ Missing CLOUDFLARE_ZONE_ID in .env');
    console.log('\n📋 To find your Zone ID:');
    console.log('   1. Go to https://dash.cloudflare.com');
    console.log('   2. Select your domain');
    console.log('   3. Look in the right sidebar under "API"');
    console.log('   4. Copy "Zone ID"');
    process.exit(1);
  }
  if (!ACCOUNT_ID) {
    console.warn('\n⚠️  Missing CLOUDFLARE_ACCOUNT_ID - some features may not work');
  }

  // Verify API token
  console.log('\n🔑 Verifying API Token...');
  const verify = await cfFetch<any>('/user/tokens/verify');
  if (!verify.success) {
    console.error('❌ Invalid API token');
    process.exit(1);
  }
  console.log('  ✅ Token valid');

  // Run setup
  await enableSecuritySettings();
  await setupFirewallRules();

  // Optionally setup DNS (uncomment and configure)
  // await setupDNS('continuum.app', '1.2.3.4');

  console.log('\n' + '='.repeat(60));
  console.log('✅ CLOUDFLARE SETUP COMPLETE');
  console.log('='.repeat(60));
  console.log('\n📋 Next steps:');
  console.log('   1. Verify settings at https://dash.cloudflare.com');
  console.log('   2. Point your domain DNS to Cloudflare nameservers');
  console.log('   3. Configure DNS A records for your server IP');
  console.log('\n');
}

main().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
