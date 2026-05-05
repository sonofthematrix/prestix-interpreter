/**
 * Documentation Manager
 * Comprehensive documentation generation and management system
 */

import { z } from 'zod';
import { contextMonitor } from './context-monitor';
import { mcpIntegration } from './mcp-integration';

// ============================================================================
// DOCUMENTATION TYPES
// ============================================================================

export interface DocumentationEntry {
  id: string;
  title: string;
  content: string;
  type: 'user-case' | 'solution' | 'lesson-learned' | 'bug-fix' | 'feature' | 'api';
  category: string;
  tags: string[];
  status: 'draft' | 'review' | 'approved' | 'published';
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  relatedEntries: string[];
  mermaidDiagrams: MermaidDiagram[];
  metadata: Record<string, any>;
}

export interface MermaidDiagram {
  id: string;
  title: string;
  type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'journey' | 'gantt' | 'pie';
  content: string;
  description?: string;
}

export interface UserCase {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  solution: string;
  challenges: string[];
  lessonsLearned: string[];
  estimatedCost: number;
  timeFrame: string;
  complexity: 'simple' | 'moderate' | 'complex';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  mcpModules: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface RegressionTest {
  id: string;
  name: string;
  description: string;
  testCases: TestCase[];
  expectedResults: string[];
  lastRun: Date;
  status: 'pass' | 'fail' | 'pending';
  coverage: number;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: string[];
  expectedResult: string;
  actualResult?: string;
  status: 'pass' | 'fail' | 'pending';
}

// ============================================================================
// DOCUMENTATION MANAGER CLASS
// ============================================================================

export class DocumentationManager {
  private static instance: DocumentationManager;
  private entries: DocumentationEntry[] = [];
  private userCases: UserCase[] = [];
  private regressionTests: RegressionTest[] = [];

  private constructor() {}

  static getInstance(): DocumentationManager {
    if (!DocumentationManager.instance) {
      DocumentationManager.instance = new DocumentationManager();
    }
    return DocumentationManager.instance;
  }

  /**
   * Create documentation entry
   */
  async createEntry(entry: Omit<DocumentationEntry, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<DocumentationEntry> {
    const newEntry: DocumentationEntry = {
      ...entry,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };

    this.entries.push(newEntry);
    
    // Monitor context usage
    contextMonitor.updateMetrics(JSON.stringify(newEntry).length / 4); // Rough token estimate

    return newEntry;
  }

  /**
   * Create user case documentation
   */
  async createUserCase(userCase: Omit<UserCase, 'id'>): Promise<UserCase> {
    const newUserCase: UserCase = {
      ...userCase,
      id: `usecase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.userCases.push(newUserCase);

    // Generate documentation entry
    await this.createEntry({
      title: `User Case: ${userCase.title}`,
      content: this.generateUserCaseContent(newUserCase),
      type: 'user-case',
      category: 'user-cases',
      tags: ['user-case', userCase.complexity, userCase.status],
      status: 'draft',
      author: 'system',
      relatedEntries: [],
      mermaidDiagrams: this.generateUserCaseDiagrams(newUserCase),
      metadata: {
        userCaseId: newUserCase.id,
        estimatedCost: userCase.estimatedCost,
        timeFrame: userCase.timeFrame,
        complexity: userCase.complexity,
        impact: userCase.impact
      }
    });

    return newUserCase;
  }

  /**
   * Record lesson learned
   */
  async recordLessonLearned(lesson: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    solution: string;
    challenges: string[];
    relatedUserCase?: string;
  }): Promise<DocumentationEntry> {
    return this.createEntry({
      title: `Lesson Learned: ${lesson.title}`,
      content: this.generateLessonContent(lesson),
      type: 'lesson-learned',
      category: lesson.category,
      tags: ['lesson-learned', ...lesson.tags],
      status: 'review',
      author: 'system',
      relatedEntries: lesson.relatedUserCase ? [lesson.relatedUserCase] : [],
      mermaidDiagrams: [],
      metadata: {
        challenges: lesson.challenges,
        solution: lesson.solution
      }
    });
  }

  /**
   * Record bug fix
   */
  async recordBugFix(bugFix: {
    title: string;
    description: string;
    rootCause: string;
    solution: string;
    prevention: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    relatedUserCase?: string;
  }): Promise<DocumentationEntry> {
    return this.createEntry({
      title: `Bug Fix: ${bugFix.title}`,
      content: this.generateBugFixContent(bugFix),
      type: 'bug-fix',
      category: 'bug-fixes',
      tags: ['bug-fix', bugFix.impact],
      status: 'approved',
      author: 'system',
      relatedEntries: bugFix.relatedUserCase ? [bugFix.relatedUserCase] : [],
      mermaidDiagrams: this.generateBugFixDiagrams(bugFix),
      metadata: {
        rootCause: bugFix.rootCause,
        solution: bugFix.solution,
        prevention: bugFix.prevention,
        impact: bugFix.impact
      }
    });
  }

  /**
   * Create regression test
   */
  async createRegressionTest(test: Omit<RegressionTest, 'id' | 'lastRun'>): Promise<RegressionTest> {
    const newTest: RegressionTest = {
      ...test,
      id: `regression-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastRun: new Date()
    };

    this.regressionTests.push(newTest);

    // Generate documentation entry
    await this.createEntry({
      title: `Regression Test: ${test.name}`,
      content: this.generateRegressionTestContent(newTest),
      type: 'feature',
      category: 'testing',
      tags: ['regression-test', 'testing'],
      status: 'approved',
      author: 'system',
      relatedEntries: [],
      mermaidDiagrams: this.generateTestDiagrams(newTest),
      metadata: {
        testId: newTest.id,
        coverage: newTest.coverage,
        testCases: newTest.testCases.length
      }
    });

    return newTest;
  }

  /**
   * Generate comprehensive documentation report
   */
  async generateComprehensiveReport(): Promise<string> {
    const report = {
      summary: {
        totalEntries: this.entries.length,
        totalUserCases: this.userCases.length,
        totalRegressionTests: this.regressionTests.length,
        lastUpdated: new Date()
      },
      userCases: this.userCases,
      lessonsLearned: this.entries.filter(e => e.type === 'lesson-learned'),
      bugFixes: this.entries.filter(e => e.type === 'bug-fix'),
      regressionTests: this.regressionTests,
      contextMetrics: contextMonitor.getAnalytics(),
      recommendations: this.generateRecommendations()
    };

    return this.formatReport(report);
  }

  /**
   * Generate Mermaid diagrams for documentation
   */
  generateMermaidDiagrams(): MermaidDiagram[] {
    const diagrams: MermaidDiagram[] = [];

    // System Architecture Diagram
    diagrams.push({
      id: 'system-architecture',
      title: 'System Architecture',
      type: 'flowchart',
      content: `graph TB
        A[User Interface] --> B[AI Builder]
        B --> C[Entity Builder]
        B --> D[Testing Harness]
        B --> E[Security Framework]
        C --> F[ZModel Schema]
        D --> G[Test Suite]
        E --> H[Compliance Engine]
        F --> I[Database]
        G --> J[Test Results]
        H --> K[Audit Logs]`,
      description: 'Overall system architecture showing component relationships'
    });

    // User Case Flow Diagram
    diagrams.push({
      id: 'user-case-flow',
      title: 'User Case Implementation Flow',
      type: 'flowchart',
      content: `graph LR
        A[User Request] --> B[Analysis]
        B --> C[AI Profile Selection]
        C --> D[Entity Design]
        D --> E[Code Generation]
        E --> F[Testing]
        F --> G[Security Review]
        G --> H[Deployment]
        H --> I[Documentation]
        I --> J[Lessons Learned]`,
      description: 'Flow of user case implementation from request to completion'
    });

    // Context Monitoring Diagram
    diagrams.push({
      id: 'context-monitoring',
      title: 'Context Window Monitoring',
      type: 'state',
      content: `stateDiagram-v2
        [*] --> Normal
        Normal --> Warning: 70% utilization
        Warning --> Critical: 90% utilization
        Critical --> Emergency: 95% utilization
        Warning --> Normal: Optimization applied
        Critical --> Warning: Optimization applied
        Emergency --> Critical: Cleanup applied`,
      description: 'Context window monitoring states and transitions'
    });

    return diagrams;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateUserCaseContent(userCase: UserCase): string {
    return `# ${userCase.title}

## Description
${userCase.description}

## Requirements
${userCase.requirements.map(req => `- ${req}`).join('\n')}

## Solution
${userCase.solution}

## Challenges
${userCase.challenges.map(challenge => `- ${challenge}`).join('\n')}

## Lessons Learned
${userCase.lessonsLearned.map(lesson => `- ${lesson}`).join('\n')}

## Project Details
- **Estimated Cost**: $${userCase.estimatedCost}
- **Time Frame**: ${userCase.timeFrame}
- **Complexity**: ${userCase.complexity}
- **Impact**: ${userCase.impact}
- **Status**: ${userCase.status}

## MCP Modules Used
${userCase.mcpModules.map(module => `- ${module}`).join('\n')}
`;
  }

  private generateLessonContent(lesson: any): string {
    return `# Lesson Learned: ${lesson.title}

## Description
${lesson.description}

## Challenges Faced
${lesson.challenges.map((challenge: string) => `- ${challenge}`).join('\n')}

## Solution Applied
${lesson.solution}

## Category
${lesson.category}

## Tags
${lesson.tags.map((tag: string) => `\`${tag}\``).join(' ')}
`;
  }

  private generateBugFixContent(bugFix: any): string {
    return `# Bug Fix: ${bugFix.title}

## Description
${bugFix.description}

## Root Cause
${bugFix.rootCause}

## Solution
${bugFix.solution}

## Prevention Measures
${bugFix.prevention}

## Impact
${bugFix.impact}
`;
  }

  private generateRegressionTestContent(test: RegressionTest): string {
    return `# Regression Test: ${test.name}

## Description
${test.description}

## Test Cases
${test.testCases.map(tc => `
### ${tc.name}
${tc.description}

**Steps:**
${tc.steps.map(step => `1. ${step}`).join('\n')}

**Expected Result:** ${tc.expectedResult}
**Status:** ${tc.status}
`).join('\n')}

## Coverage
${test.coverage}%

## Last Run
${test.lastRun.toISOString()}
`;
  }

  private generateUserCaseDiagrams(userCase: UserCase): MermaidDiagram[] {
    return [{
      id: `usecase-${userCase.id}`,
      title: `${userCase.title} - Implementation Flow`,
      type: 'flowchart',
      content: `graph TD
        A[Start] --> B[Requirements Analysis]
        B --> C[Solution Design]
        C --> D[Implementation]
        D --> E[Testing]
        E --> F[Deployment]
        F --> G[Documentation]
        G --> H[Lessons Learned]
        H --> I[End]`,
      description: `Implementation flow for ${userCase.title}`
    }];
  }

  private generateBugFixDiagrams(bugFix: any): MermaidDiagram[] {
    return [{
      id: `bugfix-${bugFix.title.replace(/\s+/g, '-').toLowerCase()}`,
      title: `${bugFix.title} - Bug Fix Process`,
      type: 'flowchart',
      content: `graph LR
        A[Bug Reported] --> B[Investigation]
        B --> C[Root Cause Analysis]
        C --> D[Solution Design]
        D --> E[Implementation]
        E --> F[Testing]
        F --> G[Deployment]
        G --> H[Prevention Measures]`,
      description: `Bug fix process for ${bugFix.title}`
    }];
  }

  private generateTestDiagrams(test: RegressionTest): MermaidDiagram[] {
    return [{
      id: `test-${test.id}`,
      title: `${test.name} - Test Flow`,
      type: 'flowchart',
      content: `graph TD
        A[Test Start] --> B[Setup]
        B --> C[Execute Test Cases]
        C --> D[Validate Results]
        D --> E[Generate Report]
        E --> F[Test Complete]`,
      description: `Test flow for ${test.name}`
    }];
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze user cases for patterns
    const completedCases = this.userCases.filter(uc => uc.status === 'completed');
    const avgCost = completedCases.reduce((sum, uc) => sum + uc.estimatedCost, 0) / completedCases.length;
    
    if (avgCost > 1000) {
      recommendations.push('Consider breaking down high-cost user cases into smaller, manageable components');
    }
    
    // Analyze lessons learned
    const lessons = this.entries.filter(e => e.type === 'lesson-learned');
    if (lessons.length > 5) {
      recommendations.push('Create a knowledge base from accumulated lessons learned');
    }
    
    // Context monitoring recommendations
    const contextStatus = contextMonitor.getStatus();
    if (contextStatus.isWarning) {
      recommendations.push('Consider implementing context optimization strategies');
    }
    
    return recommendations;
  }

  private formatReport(report: any): string {
    return `# Comprehensive Documentation Report

## Summary
- **Total Entries**: ${report.summary.totalEntries}
- **User Cases**: ${report.summary.totalUserCases}
- **Regression Tests**: ${report.summary.totalRegressionTests}
- **Last Updated**: ${report.summary.lastUpdated.toISOString()}

## Context Metrics
- **Total Tokens**: ${report.contextMetrics.totalTokens}
- **Average Utilization**: ${report.contextMetrics.averageUtilization.toFixed(2)}%
- **Peak Utilization**: ${report.contextMetrics.peakUtilization.toFixed(2)}%
- **Total Cost**: $${report.contextMetrics.totalCost.toFixed(4)}

## Recommendations
${report.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## User Cases
${report.userCases.map((uc: UserCase) => `
### ${uc.title}
- **Status**: ${uc.status}
- **Complexity**: ${uc.complexity}
- **Impact**: ${uc.impact}
- **Estimated Cost**: $${uc.estimatedCost}
`).join('\n')}

## Lessons Learned
${report.lessonsLearned.map((lesson: DocumentationEntry) => `
### ${lesson.title}
- **Category**: ${lesson.category}
- **Status**: ${lesson.status}
`).join('\n')}

## Bug Fixes
${report.bugFixes.map((fix: DocumentationEntry) => `
### ${fix.title}
- **Impact**: ${fix.metadata.impact}
- **Status**: ${fix.status}
`).join('\n')}
`;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const documentationManager = DocumentationManager.getInstance();
