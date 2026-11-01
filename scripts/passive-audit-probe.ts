/**
 * Passive Audit Probe Script
 * 
 * Conducts passive, non-intrusive observation of Cynbit's public endpoints
 * to verify response headers, server metadata, caching behavior, and RSC payloads.
 * 
 * Strict compliance: Passive testing only, zero intrusion, zero load generation.
 */

import https from 'node:https';

interface ProbeResult {
  url: string;
  statusCode?: number;
  headers: Record<string, string | string[] | undefined>;
  observationNotes: string[];
}

function probeUrl(targetUrl: string, customHeaders: Record<string, string> = {}): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        ...customHeaders,
      },
    };

    const req = https.request(options, (res) => {
      const notes: string[] = [];
      const h = res.headers;

      // 1. Tech stack leakage
      if (h['x-powered-by']) {
        notes.push(`[Stack Disclosure] 'x-powered-by: ${h['x-powered-by']}' exposes underlying framework.`);
      }

      // 2. Security headers audit
      if (!h['content-security-policy']) {
        notes.push(`[Missing Header] Content-Security-Policy (CSP) is absent.`);
      }
      if (!h['x-frame-options']) {
        notes.push(`[Missing Header] X-Frame-Options is absent (risk of clickjacking).`);
      }
      if (!h['x-content-type-options']) {
        notes.push(`[Missing Header] X-Content-Type-Options: nosniff is absent.`);
      }
      if (!h['referrer-policy']) {
        notes.push(`[Missing Header] Referrer-Policy is absent (risk of token leakage in URL).`);
      }

      // 3. CORS check
      if (h['access-control-allow-origin'] === '*') {
        notes.push(`[Permissive CORS] Access-Control-Allow-Origin: * set on top-level resource.`);
      }

      // 4. Edge & Routing topology
      if (h['x-vercel-id']) {
        notes.push(`[Edge Routing Topology] Vercel Region ID: ${h['x-vercel-id']}`);
      }

      resolve({
        url: targetUrl,
        statusCode: res.statusCode,
        headers: h,
        observationNotes: notes,
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runAudit() {
  console.log('=================================================================');
  console.log('CYNBIT TECHNOLOGIES - PASSIVE BACKEND OBSERVATION PROBE');
  console.log('Target: cynbit.in | Passive, non-intrusive metadata inspection');
  console.log('=================================================================\n');

  try {
    const rootResult = await probeUrl('https://www.cynbit.in/');
    console.log(`[Target] ${rootResult.url}`);
    console.log(`HTTP Status: ${rootResult.statusCode}`);
    console.log(`Server: ${rootResult.headers['server'] || 'Unknown'}`);
    console.log('Observed Points:');
    rootResult.observationNotes.forEach((n) => console.log(`  - ${n}`));

    console.log('\n-----------------------------------------------------------------');
    const candResult = await probeUrl('https://www.cynbit.in/candidate/cmv6c050r000d04l39fg2dix4');
    console.log(`[Target] Candidate Portal Route`);
    console.log(`HTTP Status: ${candResult.statusCode}`);
    console.log(`Matched Path: ${candResult.headers['x-matched-path'] || 'N/A'}`);
    console.log(`Cache State: ${candResult.headers['x-vercel-cache'] || 'N/A'}`);
    console.log(`Vercel Trace: ${candResult.headers['x-vercel-id'] || 'N/A'}`);
    console.log('Observed Points:');
    candResult.observationNotes.forEach((n) => console.log(`  - ${n}`));
    console.log('=================================================================\n');
  } catch (err) {
    console.error('Probe encountered error:', err);
  }
}

if (process.argv[1] && process.argv[1].includes('passive-audit-probe')) {
  runAudit();
}

export { probeUrl, runAudit };
