/**
 * Deployment Configuration Generator
 * 
 * Generates and validates deployment configurations to ensure
 * documentation routing changes are properly propagated.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { 
  DOCUMENTATION_ROUTING_CONFIG, 
  validateDocumentationRouting,
  generateDeploymentRouting 
} from './config/documentation-routing-config';

export interface DeploymentConfig {
  vercel?: {
    redirects: Array<{
      source: string;
      destination: string;
      permanent?: boolean;
    }>;
    headers: Array<{
      source: string;
      headers: Array<{
        key: string;
        value: string;
      }>;
    }>;
  };
  nextjs?: {
    rewrites: Array<{
      source: string;
      destination: string;
    }>;
    redirects: Array<{
      source: string;
      destination: string;
      permanent?: boolean;
    }>;
  };
}

export class DeploymentConfigGenerator {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Validate current deployment configuration
   */
  validateCurrentConfig(): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check vercel.json
    const vercelConfigPath = join(this.projectRoot, 'vercel.json');
    if (existsSync(vercelConfigPath)) {
      try {
        const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, 'utf-8'));
        
        // Check for problematic redirects
        if (vercelConfig.redirects) {
          const docsRedirect = vercelConfig.redirects.find(
            (redirect: any) => redirect.source === '/docs'
          );
          
          if (docsRedirect) {
            issues.push(`Found redirect from /docs to ${docsRedirect.destination} in vercel.json`);
            suggestions.push('Remove the redirect from /docs to allow the landing page to be served directly');
          }
        }
      } catch (error) {
        issues.push('Failed to parse vercel.json');
      }
    }

    // Validate documentation routing
    const routingValidation = validateDocumentationRouting();
    if (!routingValidation.isValid) {
      issues.push(...routingValidation.errors);
    }
    suggestions.push(...routingValidation.warnings);

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Generate updated deployment configuration
   */
  generateConfig(): DeploymentConfig {
    const { vercelRedirects, nextjsRewrites } = generateDeploymentRouting();

    return {
      vercel: {
        redirects: vercelRedirects,
        headers: [
          {
            source: '/api/(.*)',
            headers: [
              { key: 'Access-Control-Allow-Origin', value: '*' },
              { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
              { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
            ]
          }
        ]
      },
      nextjs: {
        rewrites: nextjsRewrites,
        redirects: vercelRedirects
      }
    };
  }

  /**
   * Update vercel.json with correct configuration
   */
  updateVercelConfig(): {
    success: boolean;
    message: string;
    changes: string[];
  } {
    const vercelConfigPath = join(this.projectRoot, 'vercel.json');
    const changes: string[] = [];

    try {
      let vercelConfig: any = {};
      
      // Read existing config
      if (existsSync(vercelConfigPath)) {
        vercelConfig = JSON.parse(readFileSync(vercelConfigPath, 'utf-8'));
      }

      // Remove problematic redirects
      if (vercelConfig.redirects) {
        const originalLength = vercelConfig.redirects.length;
        vercelConfig.redirects = vercelConfig.redirects.filter(
          (redirect: any) => redirect.source !== '/docs'
        );
        
        if (vercelConfig.redirects.length < originalLength) {
          changes.push('Removed redirect from /docs to allow landing page to be served directly');
        }
      }

      // Add documentation routing comment
      if (!vercelConfig._documentation_routing) {
        vercelConfig._documentation_routing = {
          note: 'Documentation routing updated to serve /docs directly without redirect',
          landingPage: DOCUMENTATION_ROUTING_CONFIG.landingPage.route,
          welcomePage: DOCUMENTATION_ROUTING_CONFIG.welcomePage.route,
          lastUpdated: new Date().toISOString()
        };
        changes.push('Added documentation routing metadata');
      }

      // Write updated config
      writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 4));

      return {
        success: true,
        message: 'Successfully updated vercel.json configuration',
        changes
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to update vercel.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
        changes: []
      };
    }
  }

  /**
   * Generate deployment configuration report
   */
  generateReport(): string {
    const validation = this.validateCurrentConfig();
    const config = this.generateConfig();

    let report = `# Deployment Configuration Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Validation results
    report += `## Configuration Validation\n\n`;
    if (validation.isValid) {
      report += `✅ **Status**: Valid\n\n`;
    } else {
      report += `❌ **Status**: Issues Found\n\n`;
      report += `### Issues:\n`;
      validation.issues.forEach(issue => {
        report += `- ❌ ${issue}\n`;
      });
      report += `\n`;
    }

    if (validation.suggestions.length > 0) {
      report += `### Suggestions:\n`;
      validation.suggestions.forEach(suggestion => {
        report += `- ⚠️  ${suggestion}\n`;
      });
      report += `\n`;
    }

    // Documentation routing configuration
    report += `## Documentation Routing Configuration\n\n`;
    report += `- **Landing Page**: ${DOCUMENTATION_ROUTING_CONFIG.landingPage.route}\n`;
    report += `- **Welcome Page**: ${DOCUMENTATION_ROUTING_CONFIG.welcomePage.route}\n`;
    report += `- **Auto-Redirect**: ${DOCUMENTATION_ROUTING_CONFIG.redirects.enabled ? 'Enabled' : 'Disabled'}\n\n`;

    // Generated configuration
    report += `## Generated Configuration\n\n`;
    report += `### Vercel Redirects:\n`;
    if (config.vercel?.redirects.length === 0) {
      report += `- No redirects (✅ /docs serves landing page directly)\n`;
    } else {
      config.vercel?.redirects.forEach(redirect => {
        report += `- ${redirect.source} → ${redirect.destination}${redirect.permanent ? ' (permanent)' : ''}\n`;
      });
    }
    report += `\n`;

    // Recommendations
    report += `## Recommendations\n\n`;
    report += `1. **Keep /docs as landing page**: Users should see the documentation dashboard at /docs\n`;
    report += `2. **No automatic redirects**: Let users choose to go to /docs/welcome if needed\n`;
    report += `3. **Update navigation**: Ensure navigation links point to correct routes\n`;
    report += `4. **Test deployment**: Verify that /docs serves the landing page after deployment\n\n`;

    return report;
  }

  /**
   * Run full deployment configuration update
   */
  async updateDeploymentConfig(): Promise<{
    success: boolean;
    message: string;
    report: string;
  }> {
    console.log('🔧 Updating deployment configuration for documentation routing...\n');

    // Validate current configuration
    const validation = this.validateCurrentConfig();
    console.log('📋 Validation Results:');
    if (validation.isValid) {
      console.log('   ✅ Configuration is valid');
    } else {
      console.log('   ❌ Issues found:');
      validation.issues.forEach(issue => console.log(`      - ${issue}`));
    }

    if (validation.suggestions.length > 0) {
      console.log('   ⚠️  Suggestions:');
      validation.suggestions.forEach(suggestion => console.log(`      - ${suggestion}`));
    }

    // Update vercel.json if needed
    if (!validation.isValid) {
      console.log('\n🔄 Updating vercel.json...');
      const updateResult = this.updateVercelConfig();
      
      if (updateResult.success) {
        console.log('   ✅ Successfully updated vercel.json');
        updateResult.changes.forEach(change => console.log(`      - ${change}`));
      } else {
        console.log(`   ❌ Failed to update vercel.json: ${updateResult.message}`);
        return {
          success: false,
          message: updateResult.message,
          report: this.generateReport()
        };
      }
    }

    // Generate report
    const report = this.generateReport();
    
    console.log('\n📊 Configuration update completed!');
    console.log('📄 Report generated with current configuration status');

    return {
      success: true,
      message: 'Deployment configuration updated successfully',
      report
    };
  }
}

// Export for use in scripts
export const deploymentConfigGenerator = new DeploymentConfigGenerator();

// CLI usage
if (require.main === module) {
  deploymentConfigGenerator.updateDeploymentConfig()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Deployment configuration update completed successfully!');
      } else {
        console.error('\n❌ Deployment configuration update failed:', result.message);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}
