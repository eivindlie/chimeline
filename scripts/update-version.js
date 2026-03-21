#!/usr/bin/env node
/**
 * Generate and update version.json with build hash
 * 
 * This script runs before the build to ensure each deployment has a unique hash.
 * The hash is used by the service worker for cache invalidation.
 * 
 * Hash strategies (in order of preference):
 * 1. Git commit SHA (if available)
 * 2. Current timestamp in seconds (fallback)
 * 
 * Usage: node scripts/update-version.js
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Try to get git commit hash first
let buildHash;
try {
  buildHash = execSync('git rev-parse --short HEAD', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
  console.log('📝 Using git commit hash:', buildHash);
} catch (e) {
  // Fallback to timestamp if git not available
  buildHash = Math.floor(Date.now() / 1000).toString();
  console.log('⏱️  Using timestamp hash:', buildHash);
}

const versionData = {
  buildHash,
  buildTime: new Date().toISOString(),
};

const versionPath = resolve('public/version.json');

try {
  writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n');
  console.log('✅ Updated version.json with buildHash:', buildHash);
} catch (error) {
  console.error('❌ Failed to update version.json:', error.message);
  process.exit(1);
}
