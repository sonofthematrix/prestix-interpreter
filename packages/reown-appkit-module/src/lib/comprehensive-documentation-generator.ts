/**
 * Comprehensive Documentation Generator
 * Generates comprehensive documentation with Mermaid diagrams and Docusaurus integration
 */

import { z } from 'zod';
import { documentationManager } from './documentation-manager';
import { contextMonitor } from './context-monitor';
import { mcpDeploymentManager } from './mcp-deployment-manager';

// ============================================================================
// DOCUMENTATION GENERATION TYPES
// ============================================================================

export interface DocumentationConfig {
  outputPath: string;
  format: 'markdown' | 'mdx' | 'html';
  includeMermaidDiagrams: boolean;
  includeContextMetrics: boolean;
  includeDeploymentInfo: boolean;
  includeRegressionTests: boolean;
  generateIndex: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface GeneratedDocumentation {
  id: string;
  title: string;
  content: string;
  metadata: {
    generatedAt: Date;
    contextMetrics: any;
    deploymentStatus: any;
    totalEntries: number;
    version: string;
  };
  mermaidDiagrams: any[];
  sections: DocumentationSection[];
}

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  subsections: DocumentationSubsection[];
  mermaidDiagrams: any[];
}

export interface DocumentationSubsection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'code' | 'diagram' | 'table' | 'list';
}

// ============================================================================
// COMPREHENSIVE DOCUMENTATION GENERATOR CLASS
// ============================================================================

export class ComprehensiveDocumentationGenerator {
  private static instance: ComprehensiveDocumentationGenerator;
  private config: DocumentationConfig;

  private constructor() {
    this.config = {
      outputPath: './docs/generated',
      format: 'mdx',
      includeMermaidDiagrams: true,
      includeContextMetrics: true,
      includeDeploymentInfo: true,
      includeRegressionTests: true,
      generateIndex: true,
      theme: 'auto'
    };
  }

  static getInstance(): ComprehensiveDocumentationGenerator {
    if (!ComprehensiveDocumentationGenerator.instance) {
      ComprehensiveDocumentationGenerator.instance = new ComprehensiveDocumentationGenerator();
    }
    return ComprehensiveDocumentationGenerator.instance;
  }

  /**
   * Generate comprehensive documentation
   */
  async generateComprehensiveDocumentation(): Promise<GeneratedDocumentation> {
    console.log('🚀 Starting comprehensive documentation generation...');

    // Monitor context usage
    contextMonitor.updateMetrics(1000); // Initial estimate

    try {
      // Gather all data
      const report = await documentationManager.generateComprehensiveReport();
      const contextMetrics = contextMonitor.getAnalytics();
      const deploymentStatus = mcpDeploymentManager.getDeploymentStatus();
      const mermaidDiagrams = documentationManager.generateMermaidDiagrams();

      // Generate main documentation
      const documentation: GeneratedDocumentation = {
        id: `doc-${Date.now()}`,
        title: 'Comprehensive AI Builder Documentation',
        content: await this.generateMainContent(report, contextMetrics, deploymentStatus),
        metadata: {
          generatedAt: new Date(),
          contextMetrics,
          deploymentStatus,
          totalEntries: 0, // Will be updated
          version: '1.0.0'
        },
        mermaidDiagrams,
        sections: await this.generateSections(report, contextMetrics, deploymentStatus)
      };

      // Update context usage
      contextMonitor.updateMetrics(JSON.stringify(documentation).length / 4);

      console.log('✅ Comprehensive documentation generated successfully');
      return documentation;

    } catch (error) {
      console.error('❌ Failed to generate comprehensive documentation:', error);
      throw error;
    }
  }

  /**
   * Generate Docusaurus-compatible documentation
   */
  async generateDocusaurusDocumentation(): Promise<{
    index: string;
    sections: { [key: string]: string };
    mermaidDiagrams: any[];
  }> {
    const comprehensive = await this.generateComprehensiveDocumentation();
    
    const index = this.generateDocusaurusIndex(comprehensive);
    const sections = this.generateDocusaurusSections(comprehensive);
    
    return {
      index,
      sections,
      mermaidDiagrams: comprehensive.mermaidDiagrams
    };
  }

  /**
   * Generate Mermaid diagrams for all documentation
   */
  generateAllMermaidDiagrams(): any[] {
    const diagrams: any[] = [];

    // System Architecture
    diagrams.push({
      id: 'system-architecture',
      title: 'AI Builder System Architecture',
      type: 'flowchart',
      content: `graph TB
        subgraph "User Interface Layer"
          A[AI Chatbot] --> B[Entity Builder]
          B --> C[Monitoring Dashboard]
          C --> D[Deployment Manager]
        end
        
        subgraph "AI Layer"
          E[AI Profiles] --> F[Context Monitor]
          F --> G[Documentation Manager]
          G --> H[MCP Integration]
        end
        
        subgraph "MCP Server Layer"
          I[Schema Analyzer] --> J[Code Generator]
          J --> K[Test Runner]
          K --> L[Deployment Tools]
        end
        
        subgraph "Data Layer"
          M[ZModel Schema] --> N[Database]
          N --> O[Generated Components]
          O --> P[Test Results]
        end
        
        A --> E
        E --> I
        I --> M
        M --> A`,
      description: 'Complete system architecture showing all layers and components'
    });

    // User Case Flow
    diagrams.push({
      id: 'user-case-flow',
      title: 'User Case Implementation Flow',
      type: 'flowchart',
      content: `graph LR
        A[User Request] --> B[AI Profile Selection]
        B --> C[Context Analysis]
        C --> D[Entity Design]
        D --> E[Schema Generation]
        E --> F[Code Generation]
        F --> G[Testing Harness]
        G --> H[Security Review]
        H --> I[Deployment]
        I --> J[Documentation]
        J --> K[Lessons Learned]
        K --> L[Regression Tests]`,
      description: 'Complete flow from user request to implementation and documentation'
    });

    // Context Monitoring Flow
    diagrams.push({
      id: 'context-monitoring-flow',
      title: 'Context Window Monitoring Flow',
      type: 'state',
      content: `stateDiagram-v2
        [*] --> Normal
        Normal --> Warning: 70% utilization
        Warning --> Critical: 90% utilization
        Critical --> Emergency: 95% utilization
        
        Warning --> Normal: Optimization applied
        Critical --> Warning: Optimization applied
        Emergency --> Critical: Cleanup applied
        
        Normal --> Optimization: Auto-optimize enabled
        Warning --> Optimization: Manual optimization
        Critical --> Optimization: Emergency optimization
        Emergency --> Optimization: Forced optimization
        
        Optimization --> Normal: Success
        Optimization --> Warning: Partial success
        Optimization --> Critical: Failed`,
      description: 'Context window monitoring states and optimization flows'
    });

    // MCP Deployment Flow
    diagrams.push({
      id: 'mcp-deployment-flow',
      title: 'MCP Module Deployment Flow',
      type: 'flowchart',
      content: `graph TD
        A[Module Registration] --> B[Change Scope Analysis]
        B --> C{Impact Assessment}
        C -->|Low| D[Standard Deployment]
        C -->|Medium| E[Enhanced Testing]
        C -->|High| F[Approval Required]
        C -->|Critical| G[Executive Approval]
        
        D --> H[Deploy]
        E --> H
        F --> I[Review Board]
        G --> J[Executive Review]
        I --> H
        J --> H
        
        H --> K{Deployment Success}
        K -->|Success| L[Monitor]
        K -->|Failure| M[Rollback]
        M --> N[Investigate]
        N --> O[Fix Issues]
        O --> H
        
        L --> P[Documentation]
        P --> Q[Lessons Learned]`,
      description: 'Complete MCP module deployment and rollback process'
    });

    // Testing Harness Flow
    diagrams.push({
      id: 'testing/harness-flow',
      title: 'Comprehensive Testing Harness Flow',
      type: 'flowchart',
      content: `graph TB
        A[Test Request] --> B[Test Planning]
        B --> C[Environment Setup]
        C --> D[CRUD Tests]
        D --> E[Security Tests]
        E --> F[Performance Tests]
        F --> G[UI Component Tests]
        G --> H[Integration Tests]
        H --> I[Test Results]
        I --> J{All Tests Pass}
        J -->|Yes| K[Generate Report]
        J -->|No| L[Identify Issues]
        L --> M[Fix Issues]
        M --> D
        K --> N[Documentation]
        N --> O[Regression Tests]`,
      description: 'Complete testing harness flow from planning to documentation'
    });

    // Documentation Generation Flow
    diagrams.push({
      id: 'documentation-generation-flow',
      title: 'Documentation Generation Flow',
      type: 'flowchart',
      content: `graph LR
        A[User Case] --> B[Implementation]
        B --> C[Testing]
        C --> D[Deployment]
        D --> E[Documentation Trigger]
        E --> F[Content Generation]
        F --> G[Mermaid Diagrams]
        G --> H[Context Metrics]
        H --> I[Deployment Info]
        I --> J[Regression Tests]
        J --> K[Comprehensive Report]
        K --> L[Docusaurus Integration]
        L --> M[Published Documentation]`,
      description: 'Documentation generation flow from implementation to publication'
    });

    return diagrams;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async generateMainContent(report: string, contextMetrics: any, deploymentStatus: any): Promise<string> {
    return `# Comprehensive AI Builder Documentation

## Overview
This comprehensive documentation covers the complete AI Builder system, including user cases, lessons learned, bug fixes, and regression tests. It provides a detailed view of the system's capabilities, implementation patterns, and best practices.

## System Status
- **Context Utilization**: ${contextMetrics.averageUtilization.toFixed(1)}% (Peak: ${contextMetrics.peakUtilization.toFixed(1)}%)
- **Total Cost**: $${contextMetrics.totalCost.toFixed(4)}
- **Session Duration**: ${Math.floor(contextMetrics.sessionDuration / 1000 / 60)} minutes
- **MCP Modules**: ${deploymentStatus.totalModules} total, ${deploymentStatus.deployedModules} deployed

## Key Features
- **AI-Powered Entity Building**: Create and enhance data models without coding
- **Comprehensive Testing**: End-to-end testing harness for all components
- **Real-time Monitoring**: Context window monitoring and cost tracking
- **MCP Integration**: Model Context Protocol for tool integration
- **Security Framework**: Comprehensive security and compliance features
- **Documentation Generation**: Automatic documentation with Mermaid diagrams

## Architecture
The AI Builder system is built on a modern, scalable architecture that includes:

1. **User Interface Layer**: React/Next.js with Docusaurus for documentation
2. **AI Layer**: Vercel AI SDK with multiple LLM providers
3. **MCP Server Layer**: Model Context Protocol for tool integration
4. **Data Layer**: ZenStack v3 with Prisma-compatible query API

## Getting Started
To get started with the AI Builder:

1. **Select an AI Profile**: Choose from Architect, Developer, Tester, DevOps, or Writer
2. **Define Your Entity**: Use the Entity Builder to create your data model
3. **Generate Code**: Let the AI generate React components and API routes
4. **Test Implementation**: Use the comprehensive testing harness
5. **Deploy**: Deploy your changes with the MCP Deployment Manager
6. **Document**: Automatic documentation generation with lessons learned

## Best Practices
- Always use the recommended AI profile for your task
- Test thoroughly using the comprehensive testing harness
- Monitor context usage to optimize costs
- Document lessons learned for future reference
- Use the security framework for compliance requirements

${report}
`;
  }

  private async generateSections(report: string, contextMetrics: any, deploymentStatus: any): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [];

    // System Architecture Section
    sections.push({
      id: 'system-architecture',
      title: 'System Architecture',
      content: 'Detailed system architecture and component relationships',
      subsections: [
        {
          id: 'overview',
          title: 'Architecture Overview',
          content: 'High-level overview of the AI Builder system architecture',
          type: 'text'
        },
        {
          id: 'components',
          title: 'Core Components',
          content: 'Detailed description of all core system components',
          type: 'text'
        },
        {
          id: 'data-flow',
          title: 'Data Flow',
          content: 'How data flows through the system from user input to output',
          type: 'text'
        }
      ],
      mermaidDiagrams: [
        {
          id: 'system-architecture',
          title: 'System Architecture Diagram',
          type: 'flowchart',
          content: 'graph TB...',
          description: 'Complete system architecture'
        }
      ]
    });

    // User Cases Section
    sections.push({
      id: 'user-cases',
      title: 'User Cases',
      content: 'Comprehensive collection of user cases and implementations',
      subsections: [
        {
          id: 'monitoring-token-costs',
          title: 'Monitoring and Token Cost Estimation',
          content: 'Implementation of monitoring and token cost estimation system',
          type: 'text'
        },
        {
          id: 'entity-building',
          title: 'AI-Powered Entity Building',
          content: 'Creating and enhancing data models using AI assistance',
          type: 'text'
        },
        {
          id: 'testing/harness',
          title: 'Comprehensive Testing Harness',
          content: 'End-to-end testing system for all components',
          type: 'text'
        }
      ],
      mermaidDiagrams: [
        {
          id: 'user-case-flow',
          title: 'User Case Implementation Flow',
          type: 'flowchart',
          content: 'graph LR...',
          description: 'User case implementation process'
        }
      ]
    });

    // Lessons Learned Section
    sections.push({
      id: 'lessons-learned',
      title: 'Lessons Learned',
      content: 'Key lessons learned from implementations and challenges overcome',
      subsections: [
        {
          id: 'context-optimization',
          title: 'Context Window Optimization',
          content: 'Best practices for managing context window usage and costs',
          type: 'text'
        },
        {
          id: 'mcp-integration',
          title: 'MCP Integration Patterns',
          content: 'Effective patterns for MCP server integration and tool development',
          type: 'text'
        },
        {
          id: 'testing-strategies',
          title: 'Testing Strategies',
          content: 'Comprehensive testing strategies for AI-powered applications',
          type: 'text'
        }
      ],
      mermaidDiagrams: []
    });

    return sections;
  }

  private generateDocusaurusIndex(comprehensive: GeneratedDocumentation): string {
    return `---
title: Comprehensive AI Builder Documentation
description: Complete documentation for the AI Builder system
---

import { Mermaid } from '@docusaurus/theme-mermaid';

# Comprehensive AI Builder Documentation

## Overview
This comprehensive documentation covers the complete AI Builder system, including user cases, lessons learned, bug fixes, and regression tests.

## System Status
- **Context Utilization**: ${comprehensive.metadata.contextMetrics.averageUtilization.toFixed(1)}%
- **Total Cost**: $${comprehensive.metadata.contextMetrics.totalCost.toFixed(4)}
- **MCP Modules**: ${comprehensive.metadata.deploymentStatus.totalModules} total

## Quick Start
1. Select an AI Profile
2. Define Your Entity
3. Generate Code
4. Test Implementation
5. Deploy Changes
6. Document Results

## Architecture

<Mermaid chart={comprehensive.mermaidDiagrams.find(d => d.id === 'system-architecture')?.content} />

## User Case Flow

<Mermaid chart={comprehensive.mermaidDiagrams.find(d => d.id === 'user-case-flow')?.content} />

${comprehensive.content}
`;
  }

  private generateDocusaurusSections(comprehensive: GeneratedDocumentation): { [key: string]: string } {
    const sections: { [key: string]: string } = {};

    comprehensive.sections.forEach(section => {
      sections[section.id] = `---
title: ${section.title}
description: ${section.content}
---

import { Mermaid } from '@docusaurus/theme-mermaid';

# ${section.title}

${section.content}

${section.subsections.map(subsection => `
## ${subsection.title}

${subsection.content}
`).join('\n')}

${section.mermaidDiagrams.map(diagram => `
<Mermaid chart={${JSON.stringify(diagram.content)}} />
`).join('\n')}
`;
    });

    return sections;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const comprehensiveDocumentationGenerator = ComprehensiveDocumentationGenerator.getInstance();
