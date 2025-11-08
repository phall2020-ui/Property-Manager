#!/usr/bin/env node

/**
 * Functional Gap Analysis Tool
 * 
 * Analyzes frontend, backend, and UI to identify functional gaps,
 * inconsistencies, and missing integrations.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FRONTEND_DIR = path.join(__dirname, 'frontend-new/src');
const BACKEND_DIR = path.join(__dirname, 'backend/apps/api/src');

// Results storage
const results = {
  frontendGaps: [],
  backendGaps: [],
  integrationGaps: [],
  endpoints: new Set(),
  apiCalls: new Set(),
  routes: [],
  pages: [],
  components: [],
};

// Utility: Recursively find files
function findFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        findFiles(filePath, pattern, results);
      }
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Utility: Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return '';
  }
}

// Analyze backend controllers and routes
function analyzeBackend() {
  console.log('🔍 Analyzing backend...');
  
  const controllerFiles = findFiles(BACKEND_DIR, /\.controller\.ts$/);
  
  controllerFiles.forEach((file) => {
    const content = readFile(file);
    const moduleName = path.basename(path.dirname(file));
    
    // Extract controller routes
    const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
    const basePath = controllerMatch ? controllerMatch[1] : '';
    
    // Find all HTTP method decorators
    const methodRegex = /@(Get|Post|Put|Patch|Delete)\(['"]?([^'")\n]*)?['"]?\)/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2] || '';
      const fullPath = `${basePath}/${routePath}`.replace(/\/+/g, '/').replace(/\/$/, '') || `/${basePath}`;
      const endpoint = `${method} /api/${fullPath}`;
      
      results.endpoints.add(endpoint);
      results.routes.push({
        method,
        path: fullPath,
        module: moduleName,
        file: path.relative(__dirname, file),
      });
    }
    
    // Check for validation
    const hasValidation = content.includes('class-validator') || content.includes('Dto');
    
    // Check for authentication
    const hasAuth = content.includes('@ApiBearerAuth') || content.includes('JwtAuthGuard');
    
    // Check for guards
    const hasGuards = content.includes('@UseGuards');
    
    if (!hasAuth && !content.includes('auth.controller')) {
      results.backendGaps.push({
        area: 'Backend - Authentication',
        description: `Controller "${moduleName}" may be missing authentication`,
        impact: 'Medium',
        file: path.relative(__dirname, file),
        suggestedFix: 'Add @ApiBearerAuth() and @UseGuards(JwtAuthGuard) to protected routes',
      });
    }
    
    if (!hasValidation && !content.includes('events.controller') && !content.includes('queue.controller')) {
      results.backendGaps.push({
        area: 'Backend - Validation',
        description: `Controller "${moduleName}" may be missing request validation`,
        impact: 'Medium',
        file: path.relative(__dirname, file),
        suggestedFix: 'Add DTOs with class-validator decorators for request validation',
      });
    }
  });
  
  // Check for disabled modules
  const disabledModules = findFiles(BACKEND_DIR, /\.disabled$/);
  disabledModules.forEach((dir) => {
    const moduleName = path.basename(dir).replace('.disabled', '');
    results.backendGaps.push({
      area: 'Backend - Disabled Module',
      description: `Module "${moduleName}" is disabled but may have frontend dependencies`,
      impact: 'High',
      file: path.relative(__dirname, dir),
      suggestedFix: 'Re-enable module or remove frontend references to this feature',
    });
  });
  
  console.log(`✅ Found ${results.endpoints.size} backend endpoints`);
}

// Analyze frontend pages and components
function analyzeFrontend() {
  console.log('🔍 Analyzing frontend...');
  
  // Analyze pages
  const pageFiles = findFiles(path.join(FRONTEND_DIR, 'pages'), /\.(tsx|ts)$/);
  
  pageFiles.forEach((file) => {
    const content = readFile(file);
    const pageName = path.basename(file, path.extname(file));
    
    results.pages.push({
      name: pageName,
      file: path.relative(__dirname, file),
    });
    
    // Check for API calls
    const apiCallRegex = /api\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/gi;
    let match;
    
    while ((match = apiCallRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const apiPath = match[2];
      const call = `${method} ${apiPath}`;
      results.apiCalls.add(call);
    }
    
    // Check for axios calls
    const axiosRegex = /axios\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/gi;
    while ((match = axiosRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const apiPath = match[2];
      const call = `${method} ${apiPath}`;
      results.apiCalls.add(call);
    }
    
    // Check for missing error handling
    const hasErrorHandling = content.includes('try') && content.includes('catch');
    const hasTryCatch = content.includes('try {') || content.includes('try{');
    const hasErrorState = content.includes('error') || content.includes('Error');
    
    if (!hasErrorHandling && (content.includes('api.') || content.includes('axios.'))) {
      results.frontendGaps.push({
        area: 'Frontend - Error Handling',
        description: `Page "${pageName}" makes API calls without try-catch error handling`,
        impact: 'Medium',
        file: path.relative(__dirname, file),
        suggestedFix: 'Wrap API calls in try-catch blocks and display error messages to users',
      });
    }
    
    // Check for loading states
    const hasLoadingState = content.includes('loading') || content.includes('isLoading') || content.includes('Loading');
    
    if ((content.includes('api.') || content.includes('axios.')) && !hasLoadingState) {
      results.frontendGaps.push({
        area: 'Frontend - Loading State',
        description: `Page "${pageName}" makes API calls without loading state indicators`,
        impact: 'Low',
        file: path.relative(__dirname, file),
        suggestedFix: 'Add loading state management and UI feedback during API calls',
      });
    }
    
    // Check for form validation
    const hasForm = content.includes('form') || content.includes('Form') || content.includes('input');
    const hasValidation = content.includes('validation') || content.includes('validate') || content.includes('required');
    
    if (hasForm && !hasValidation && (pageName.includes('Create') || pageName.includes('Edit') || pageName.includes('Form'))) {
      results.frontendGaps.push({
        area: 'Frontend - Form Validation',
        description: `Page "${pageName}" has form inputs without client-side validation`,
        impact: 'Medium',
        file: path.relative(__dirname, file),
        suggestedFix: 'Add form validation using a library like react-hook-form or Zod',
      });
    }
    
    // Check for hardcoded or mock data
    const hasMockData = content.includes('TODO') || content.includes('FIXME') || content.includes('mock') || content.includes('placeholder');
    
    if (hasMockData) {
      results.frontendGaps.push({
        area: 'Frontend - Mock Data',
        description: `Page "${pageName}" contains TODO comments, mock data, or placeholders`,
        impact: 'Medium',
        file: path.relative(__dirname, file),
        suggestedFix: 'Replace mock data with actual API integration',
      });
    }
  });
  
  // Analyze API client
  const apiClientPath = path.join(FRONTEND_DIR, 'lib/api.ts');
  if (fs.existsSync(apiClientPath)) {
    const apiContent = readFile(apiClientPath);
    
    // Extract all API function definitions
    const apiFunctionRegex = /export const \w+Api = \{[\s\S]*?\};/g;
    const matches = apiContent.match(apiFunctionRegex);
    
    if (matches) {
      matches.forEach((match) => {
        const functionRegex = /(\w+):\s*async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?api\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/g;
        let funcMatch;
        
        while ((funcMatch = functionRegex.exec(match)) !== null) {
          const method = funcMatch[2].toUpperCase();
          const apiPath = funcMatch[3];
          const call = `${method} ${apiPath}`;
          results.apiCalls.add(call);
        }
      });
    }
  }
  
  console.log(`✅ Found ${results.pages.length} frontend pages`);
  console.log(`✅ Found ${results.apiCalls.size} frontend API calls`);
}

// Analyze integration between frontend and backend
function analyzeIntegration() {
  console.log('🔍 Analyzing integration...');
  
  // Find API calls that don't have corresponding backend endpoints
  results.apiCalls.forEach((call) => {
    // Normalize by replacing parameters with :id and ensuring /api prefix
    let normalized = call.replace(/:\w+/g, ':id').replace(/\{[^}]+\}/g, ':id');
    
    // Add /api prefix if not present for comparison
    if (!normalized.includes('/api/')) {
      const parts = normalized.split(' ');
      if (parts.length === 2) {
        normalized = `${parts[0]} /api${parts[1]}`;
      }
    }
    
    let found = false;
    for (const endpoint of results.endpoints) {
      const normalizedEndpoint = endpoint.replace(/:\w+/g, ':id').replace(/\{[^}]+\}/g, ':id');
      
      // Check if they match
      if (normalizedEndpoint === normalized || 
          normalizedEndpoint.replace('/api/', '/') === normalized.replace('/api/', '/')) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      results.integrationGaps.push({
        area: 'Integration - Missing Backend',
        description: `Frontend makes API call "${call}" but no matching backend endpoint found`,
        impact: 'High',
        file: 'Frontend API calls',
        suggestedFix: 'Implement the backend endpoint or remove/update the frontend call',
      });
    }
  });
  
  // Find backend endpoints that aren't called by frontend
  results.endpoints.forEach((endpoint) => {
    // Skip certain system endpoints
    if (endpoint.includes('/auth/') || endpoint.includes('/events')) {
      return;
    }
    
    const normalized = endpoint.replace(/:\w+/g, ':id').replace(/\{[^}]+\}/g, ':id');
    
    let found = false;
    for (const call of results.apiCalls) {
      let normalizedCall = call.replace(/:\w+/g, ':id').replace(/\{[^}]+\}/g, ':id');
      
      // Add /api prefix if not present for comparison
      if (!normalizedCall.includes('/api/')) {
        const parts = normalizedCall.split(' ');
        if (parts.length === 2) {
          normalizedCall = `${parts[0]} /api${parts[1]}`;
        }
      }
      
      // Check if they match
      if (normalizedCall === normalized || 
          normalizedCall.replace('/api/', '/') === normalized.replace('/api/', '/')) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      results.integrationGaps.push({
        area: 'Integration - Unused Backend',
        description: `Backend endpoint "${endpoint}" exists but is not called by frontend`,
        impact: 'Low',
        file: 'Backend endpoints',
        suggestedFix: 'Add frontend UI to use this endpoint or remove if no longer needed',
      });
    }
  });
  
  console.log(`✅ Integration analysis complete`);
}

// Generate markdown report
function generateReport() {
  console.log('📝 Generating report...');
  
  let report = `# Functional Gap Analysis Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `**Repository:** Property Manager Platform\n\n`;
  
  // Summary statistics
  report += `## 📊 Summary\n\n`;
  report += `- **Backend Endpoints:** ${results.endpoints.size}\n`;
  report += `- **Frontend Pages:** ${results.pages.length}\n`;
  report += `- **Frontend API Calls:** ${results.apiCalls.size}\n`;
  report += `- **Frontend Gaps Found:** ${results.frontendGaps.length}\n`;
  report += `- **Backend Gaps Found:** ${results.backendGaps.length}\n`;
  report += `- **Integration Gaps Found:** ${results.integrationGaps.length}\n`;
  report += `- **Total Issues:** ${results.frontendGaps.length + results.backendGaps.length + results.integrationGaps.length}\n\n`;
  
  // Frontend Gaps
  report += `## 🎨 Frontend Gaps\n\n`;
  if (results.frontendGaps.length === 0) {
    report += `✅ No significant frontend gaps detected.\n\n`;
  } else {
    report += `| Area | Description | Impact | Suggested Fix (high-level, no code) |\n`;
    report += `|------|-------------|--------|--------------------------------------|\n`;
    
    results.frontendGaps.forEach((gap) => {
      report += `| ${gap.area} | ${gap.description}<br>**File:** \`${gap.file}\` | ${gap.impact} | ${gap.suggestedFix} |\n`;
    });
    report += `\n`;
  }
  
  // Backend Gaps
  report += `## ⚙️ Backend Gaps\n\n`;
  if (results.backendGaps.length === 0) {
    report += `✅ No significant backend gaps detected.\n\n`;
  } else {
    report += `| Area | Description | Impact | Suggested Fix (high-level, no code) |\n`;
    report += `|------|-------------|--------|--------------------------------------|\n`;
    
    results.backendGaps.forEach((gap) => {
      report += `| ${gap.area} | ${gap.description}<br>**File:** \`${gap.file}\` | ${gap.impact} | ${gap.suggestedFix} |\n`;
    });
    report += `\n`;
  }
  
  // Integration Gaps
  report += `## 🔗 UI/Integration Gaps\n\n`;
  if (results.integrationGaps.length === 0) {
    report += `✅ No significant integration gaps detected.\n\n`;
  } else {
    report += `| Area | Description | Impact | Suggested Fix (high-level, no code) |\n`;
    report += `|------|-------------|--------|--------------------------------------|\n`;
    
    results.integrationGaps.forEach((gap) => {
      report += `| ${gap.area} | ${gap.description} | ${gap.impact} | ${gap.suggestedFix} |\n`;
    });
    report += `\n`;
  }
  
  // Detailed endpoints list
  report += `## 📋 Detailed Findings\n\n`;
  
  report += `### Backend Endpoints\n\n`;
  const sortedEndpoints = Array.from(results.endpoints).sort();
  sortedEndpoints.forEach((endpoint) => {
    report += `- \`${endpoint}\`\n`;
  });
  report += `\n`;
  
  report += `### Frontend Pages\n\n`;
  results.pages.forEach((page) => {
    report += `- **${page.name}** (\`${page.file}\`)\n`;
  });
  report += `\n`;
  
  // Prioritization summary
  report += `## 🎯 Priority Summary\n\n`;
  
  const highImpactGaps = [
    ...results.frontendGaps.filter(g => g.impact === 'High'),
    ...results.backendGaps.filter(g => g.impact === 'High'),
    ...results.integrationGaps.filter(g => g.impact === 'High'),
  ];
  
  const mediumImpactGaps = [
    ...results.frontendGaps.filter(g => g.impact === 'Medium'),
    ...results.backendGaps.filter(g => g.impact === 'Medium'),
    ...results.integrationGaps.filter(g => g.impact === 'Medium'),
  ];
  
  report += `### 🔴 High Priority Issues (${highImpactGaps.length})\n\n`;
  if (highImpactGaps.length === 0) {
    report += `No high priority issues found.\n\n`;
  } else {
    highImpactGaps.forEach((gap, index) => {
      report += `${index + 1}. **${gap.area}**: ${gap.description}\n`;
    });
    report += `\n`;
  }
  
  report += `### 🟡 Medium Priority Issues (${mediumImpactGaps.length})\n\n`;
  if (mediumImpactGaps.length === 0) {
    report += `No medium priority issues found.\n\n`;
  } else {
    mediumImpactGaps.slice(0, 5).forEach((gap, index) => {
      report += `${index + 1}. **${gap.area}**: ${gap.description}\n`;
    });
    if (mediumImpactGaps.length > 5) {
      report += `\n_...and ${mediumImpactGaps.length - 5} more_\n`;
    }
    report += `\n`;
  }
  
  // Overall assessment
  report += `## 📌 Overall Assessment\n\n`;
  
  const totalGaps = results.frontendGaps.length + results.backendGaps.length + results.integrationGaps.length;
  
  if (totalGaps === 0) {
    report += `✅ **Excellent!** No major functional gaps detected. The frontend, backend, and UI appear to be well-aligned.\n\n`;
  } else {
    report += `### Major Pain Points:\n\n`;
    
    // Analyze patterns
    const disabledModules = results.backendGaps.filter(g => g.area.includes('Disabled Module'));
    const missingBackend = results.integrationGaps.filter(g => g.area.includes('Missing Backend'));
    const unusedBackend = results.integrationGaps.filter(g => g.area.includes('Unused Backend'));
    const missingErrorHandling = results.frontendGaps.filter(g => g.area.includes('Error Handling'));
    const missingValidation = results.frontendGaps.filter(g => g.area.includes('Validation'));
    
    if (disabledModules.length > 0) {
      report += `- **Disabled Backend Modules (${disabledModules.length})**: Several backend modules are disabled but may have frontend dependencies. This could cause runtime errors.\n`;
    }
    
    if (missingBackend.length > 0) {
      report += `- **Frontend Ahead of Backend (${missingBackend.length})**: Frontend is making API calls to endpoints that don't exist in the backend.\n`;
    }
    
    if (unusedBackend.length > 0) {
      report += `- **Backend Unused (${unusedBackend.length})**: Backend endpoints exist but are not being used by the frontend, indicating incomplete UI implementation.\n`;
    }
    
    if (missingErrorHandling.length > 0) {
      report += `- **Missing Error Handling (${missingErrorHandling.length})**: Many pages make API calls without proper error handling, leading to poor user experience.\n`;
    }
    
    if (missingValidation.length > 0) {
      report += `- **Missing Validation (${missingValidation.length})**: Forms and API calls lack proper validation, which could lead to bad data or security issues.\n`;
    }
    
    report += `\n### Areas to Prioritize:\n\n`;
    report += `1. **Re-enable or Remove Disabled Modules**: Resolve the status of disabled backend modules to prevent frontend errors.\n`;
    report += `2. **Complete Missing Backend Endpoints**: Implement backend endpoints that the frontend is trying to call.\n`;
    report += `3. **Add Error Handling**: Improve user experience by adding proper error handling in frontend pages.\n`;
    report += `4. **Enhance Form Validation**: Add client-side and server-side validation for better data quality.\n`;
    report += `5. **Complete UI Features**: Build frontend interfaces for unused backend capabilities.\n\n`;
  }
  
  report += `---\n\n`;
  report += `**Note:** This analysis is automated and may have false positives. Manual review is recommended.\n`;
  
  return report;
}

// Main execution
function main() {
  console.log('🚀 Starting Functional Gap Analysis...\n');
  
  try {
    analyzeBackend();
    analyzeFrontend();
    analyzeIntegration();
    
    const report = generateReport();
    
    // Write report to file
    const reportPath = path.join(__dirname, 'FUNCTIONAL_GAP_ANALYSIS.md');
    fs.writeFileSync(reportPath, report, 'utf-8');
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`📄 Report saved to: ${reportPath}\n`);
    
    // Print summary to console
    console.log('📊 Summary:');
    console.log(`   - Frontend Gaps: ${results.frontendGaps.length}`);
    console.log(`   - Backend Gaps: ${results.backendGaps.length}`);
    console.log(`   - Integration Gaps: ${results.integrationGaps.length}`);
    console.log(`   - Total Issues: ${results.frontendGaps.length + results.backendGaps.length + results.integrationGaps.length}\n`);
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
if (require.main === module) {
  main();
}

module.exports = { main, analyzeBackend, analyzeFrontend, analyzeIntegration, generateReport };
