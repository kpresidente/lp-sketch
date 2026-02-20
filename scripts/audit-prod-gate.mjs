import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function readAllowlist() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const allowlistPath = resolve(scriptDir, '..', 'security', 'audit-allowlist.json');
  return JSON.parse(readFileSync(allowlistPath, 'utf8'));
}

function runAudit() {
  let output = '';
  try {
    output = execSync('npm audit --omit=dev --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    output = `${error?.stdout ?? ''}`.trim();
    if (!output) {
      const stderr = `${error?.stderr ?? ''}`.trim();
      throw new Error(`Failed to execute npm audit: ${stderr || error?.message || 'unknown error'}`);
    }
  }

  let report;
  try {
    report = JSON.parse(output);
  } catch (error) {
    throw new Error('Failed to parse npm audit JSON output.');
  }

  return report;
}

function evaluateReport(report, allowlist) {
  const allowedHigh = new Set(allowlist?.allowedPackages?.high || []);
  const allowedCritical = new Set(allowlist?.allowedPackages?.critical || []);
  const vulnerabilities = report?.vulnerabilities || {};
  const unapprovedHigh = [];
  const unapprovedCritical = [];
  const approvedHigh = [];
  const approvedCritical = [];

  for (const [name, vuln] of Object.entries(vulnerabilities)) {
    const severity = vuln?.severity;
    if (severity === 'high') {
      if (allowedHigh.has(name)) {
        approvedHigh.push(name);
      } else {
        unapprovedHigh.push(name);
      }
    }
    if (severity === 'critical') {
      if (allowedCritical.has(name)) {
        approvedCritical.push(name);
      } else {
        unapprovedCritical.push(name);
      }
    }
  }

  return {
    counts: report?.metadata?.vulnerabilities || {},
    approvedHigh: approvedHigh.sort(),
    approvedCritical: approvedCritical.sort(),
    unapprovedHigh: unapprovedHigh.sort(),
    unapprovedCritical: unapprovedCritical.sort(),
  };
}

function main() {
  const allowlist = readAllowlist();
  const report = runAudit();
  const evaluation = evaluateReport(report, allowlist);
  const counts = evaluation.counts;

  console.log(
    `[audit:prod:gate] Summary: total=${counts.total ?? 0}, high=${counts.high ?? 0}, critical=${counts.critical ?? 0}`
  );

  if (evaluation.approvedHigh.length > 0) {
    console.log(
      `[audit:prod:gate] Allowlisted high packages: ${evaluation.approvedHigh.join(', ')}`
    );
  }

  if (evaluation.approvedCritical.length > 0) {
    console.log(
      `[audit:prod:gate] Allowlisted critical packages: ${evaluation.approvedCritical.join(', ')}`
    );
  }

  if (evaluation.unapprovedHigh.length > 0) {
    console.error(
      `[audit:prod:gate] Unapproved high packages: ${evaluation.unapprovedHigh.join(', ')}`
    );
  }

  if (evaluation.unapprovedCritical.length > 0) {
    console.error(
      `[audit:prod:gate] Unapproved critical packages: ${evaluation.unapprovedCritical.join(', ')}`
    );
  }

  if (evaluation.unapprovedHigh.length > 0 || evaluation.unapprovedCritical.length > 0) {
    process.exit(1);
  }

  console.log('[audit:prod:gate] PASS');
}

main();
