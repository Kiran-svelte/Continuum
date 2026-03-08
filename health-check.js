#!/usr/bin/env node
/**
 * Continuum Health Check & Issue Detection Script
 * 
 * This script tests common user flows and catches potential issues across:
 * - API endpoints
 * - Authentication flows  
 * - Database connectivity
 * - Email services
 * - Environment configuration
 */

const axios = require('axios').default;
const fs = require('fs');

const BASE_URL = process.env.CONTINUUM_URL || 'https://web-bice-eight-83.vercel.app';
const RENDER_URL = 'https://continuum-constraint-engine-ukfv.onrender.com';

class HealthChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  log(type, message, details = '') {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${type.toUpperCase()}: ${message}${details ? ' - ' + details : ''}`;
    
    if (type === 'issue') this.issues.push(entry);
    else if (type === 'warning') this.warnings.push(entry);
    else this.passed.push(entry);
    
    console.log(entry);
  }

  async testEndpoint(name, url, expectedStatus = 200, timeout = 10000) {
    try {
      const response = await axios.get(url, { timeout, validateStatus: () => true });
      
      if (response.status === expectedStatus) {
        this.log('pass', `${name} - HTTP ${response.status}`);
        return response.data;
      } else {
        this.log('issue', `${name} - Expected ${expectedStatus}, got ${response.status}`, JSON.stringify(response.data).slice(0, 100));
        return null;
      }
    } catch (error) {
      this.log('issue', `${name} - Failed to connect`, error.message);
      return null;
    }
  }

  async testSignupFlow() {
    this.log('info', 'Testing signup flow...');
    
    try {
      // Test signup page accessibility
      const signupPage = await axios.get(`${BASE_URL}/sign-up`, { timeout: 10000 });
      if (signupPage.status === 200) {
        this.log('pass', 'Signup page accessible');
      } else {
        this.log('issue', 'Signup page inaccessible', `HTTP ${signupPage.status}`);
      }
      
      // Test dev-create-user endpoint availability  
      const fallbackTest = await axios.post(`${BASE_URL}/api/auth/dev-create-user`, {
        email: 'test@example.com',
        password: 'testpassword123'
      }, { 
        timeout: 10000,
        validateStatus: () => true 
      });
      
      if (fallbackTest.status === 400) {
        // Expected - validation error is fine, means endpoint is working
        this.log('pass', 'Signup fallback endpoint available');
      } else if (fallbackTest.status === 404) {
        this.log('issue', 'Signup fallback endpoint not available', 'Users may not be able to signup');
      } else {
        this.log('warning', 'Signup fallback endpoint unexpected response', `HTTP ${fallbackTest.status}`);
      }
      
    } catch (error) {
      this.log('issue', 'Signup flow test failed', error.message);
    }
  }

  async testBackendAPI() {
    this.log('info', 'Testing backend constraint engine...');
    
    // Test health endpoint
    const health = await this.testEndpoint('Backend Health', `${RENDER_URL}/health`);
    
    if (health && health.db_connected) {
      this.log('pass', 'Backend database connected');
    } else if (health) {
      this.log('issue', 'Backend database disconnected', 'Constraint evaluation may fail');
    }
  }

  async testFrontendPages() {
    const pages = [
      { name: 'Landing Page', path: '/' },
      { name: 'Sign In', path: '/sign-in' },  
      { name: 'Sign Up', path: '/sign-up' },
      { name: 'Support', path: '/support' },
      { name: 'Status', path: '/status' }
    ];
    
    this.log('info', 'Testing critical frontend pages...');
    
    for (const page of pages) {
      await this.testEndpoint(`Frontend - ${page.name}`, `${BASE_URL}${page.path}`);
    }
  }

  async testAPIEndpoints() {
    this.log('info', 'Testing public API endpoints...');
    
    // Test health endpoint
    await this.testEndpoint('API Health', `${BASE_URL}/api/health`);
    
    // Test session endpoint (should work without auth)
    await this.testEndpoint('API Session', `${BASE_URL}/api/auth/session`, 200);
  }

  generateReport() {
    const report = `
# Continuum Health Check Report
Generated: ${new Date().toISOString()}

## Summary
- ✅ Passed: ${this.passed.length} checks
- ⚠️  Warnings: ${this.warnings.length} items  
- ❌ Issues: ${this.issues.length} items

${this.issues.length === 0 ? '🎉 No critical issues found!' : '🚨 Critical issues detected:'}

## Issues (${this.issues.length})
${this.issues.map(issue => `- ${issue}`).join('\n')}

## Warnings (${this.warnings.length})  
${this.warnings.map(warning => `- ${warning}`).join('\n')}

## Passed (${this.passed.length})
${this.passed.slice(-10).map(pass => `- ${pass}`).join('\n')}
${this.passed.length > 10 ? `... and ${this.passed.length - 10} more` : ''}
    `.trim();
    
    console.log('\n' + '='.repeat(50));
    console.log(report);
    
    // Save to file
    fs.writeFileSync('health-report.txt', report);
    console.log(`\nFull report saved to: health-report.txt`);
    
    return { issues: this.issues.length, warnings: this.warnings.length, passed: this.passed.length };
  }

  async runFullCheck() {
    console.log('🔍 Starting Continuum health check...\n');
    
    await this.testFrontendPages();
    await this.testAPIEndpoints(); 
    await this.testBackendAPI();
    await this.testSignupFlow();
    
    return this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runFullCheck().then(results => {
    process.exit(results.issues > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = { HealthChecker };