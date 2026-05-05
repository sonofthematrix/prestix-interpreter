/**
 * AI Profile Customization System
 * Dynamic AI profile creation and management for specific use cases
 */

import { z } from 'zod';
import { TigerPalaceDB } from './database-client';
import { getAIProfile, AI_PROFILES, type AIProfile } from '../../../../ai-profiles';

// ============================================================================
// AI PROFILE CUSTOMIZATION TYPES
// ============================================================================

export interface CustomAIProfile extends AIProfile {
  id: string;
  userId: string; 
  isCustom: boolean;
  isPublic: boolean;
  tags: string[];
  useCase: string;
  businessModel: string;
  integrations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ecommerce' | 'saas' | 'fintech' | 'healthcare' | 'education' | 'gaming' | 'custom';
  baseProfile: string;
  customizations: ProfileCustomization[];
  isPublic: boolean;
  usageCount: number;
}

export interface ProfileCustomization {
  field: keyof AIProfile;
  value: any;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export interface UseCaseAnalysis {
  id: string;
  name: string;
  description: string;
  requirements: UseCaseRequirement[];
  recommendedProfiles: string[];
  customizations: ProfileCustomization[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTokens: number;
  estimatedCost: number;
}

export interface UseCaseRequirement {
  id: string;
  category: 'technical' | 'business' | 'compliance' | 'integration';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRequired: boolean;
}

export interface BusinessModel {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  aiRequirements: string[];
  complianceNeeds: string[];
  integrationPoints: string[];
}

export interface IntegrationPartner {
  id: string;
  name: string;
  category: 'payment' | 'analytics' | 'communication' | 'storage' | 'ai' | 'security';
  description: string;
  capabilities: string[];
  apiEndpoints: string[];
  documentation: string;
  isActive: boolean;
}

// ============================================================================
// AI PROFILE CUSTOMIZER CLASS
// ============================================================================

export class AIProfileCustomizer {
  private db: any;
  private templates: ProfileTemplate[] = [];
  private businessModels: BusinessModel[] = [];
  private integrationPartners: IntegrationPartner[] = [];

  constructor() {
    this.db = null;
  }

  /**
   * Initialize the AI profile customizer
   */
  async initialize(): Promise<void> {
    try { 
      this.db = new TigerPalaceDB();
      await this.loadTemplates(); 
      await this.loadBusinessModels();
      await this.loadIntegrationPartners();
      console.log('✅ AI Profile Customizer initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Profile Customizer:', error);
      throw error;
    }
  }

  /**
   * Analyze use case and recommend AI profile
   */
  async analyzeUseCase(useCase: string, context: {
    businessModel?: string;
    industry?: string;
    compliance?: string[];
    integrations?: string[];
    technicalComplexity?: 'simple' | 'moderate' | 'complex';
    budget?: 'low' | 'medium' | 'high';
  }): Promise<UseCaseAnalysis> {
    try {
      const analysis: UseCaseAnalysis = {
        id: `analysis-${Date.now()}`,
        name: useCase,
        description: `Analysis for: ${useCase}`,
        requirements: [],
        recommendedProfiles: [],
        customizations: [],
        complexity: context.technicalComplexity || 'moderate',
        estimatedTokens: 0,
        estimatedCost: 0
      };

      // Analyze requirements based on use case
      analysis.requirements = await this.extractRequirements(useCase, context);

      // Recommend base profiles
      analysis.recommendedProfiles = await this.recommendProfiles(analysis.requirements);

      // Generate customizations
      analysis.customizations = await this.generateCustomizations(analysis.requirements, context);

      // Estimate costs
      const costEstimate = await this.estimateCosts(analysis);
      analysis.estimatedTokens = costEstimate.tokens;
      analysis.estimatedCost = costEstimate.cost;

      return analysis;
    } catch (error) {
      console.error('Use case analysis failed:', error);
      throw error;
    }
  }

  /**
   * Create custom AI profile
   */
  async createCustomProfile(
    userId: string,
    baseProfile: string,
    customizations: ProfileCustomization[],
    metadata: {
      name: string;
      description: string;
      useCase: string;
      businessModel: string;
      tags: string[];
      isPublic: boolean;
    }
  ): Promise<CustomAIProfile> {
    try {
      const base = getAIProfile(baseProfile);
      if (!base) {
        throw new Error(`Base profile ${baseProfile} not found`);
      }

      // Apply customizations
      const customizedProfile = this.applyCustomizations(base, customizations);

      // Create custom profile
      const customProfile: CustomAIProfile = {
        ...customizedProfile,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        isCustom: true,
        isPublic: metadata.isPublic,
        tags: metadata.tags,
        useCase: metadata.useCase,
        businessModel: metadata.businessModel,
        integrations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      if (this.db) {
        await this.db.customAIProfile.create({
          data: customProfile
        });
      }

      return customProfile;
    } catch (error) {
      console.error('Failed to create custom profile:', error);
      throw error;
    }
  }

  /**
   * Get available profile templates
   */
  async getProfileTemplates(category?: string): Promise<ProfileTemplate[]> {
    if (category) {
      return this.templates.filter(t => t.category === category);
    }
    return this.templates;
  }

  /**
   * Get business models
   */
  async getBusinessModels(): Promise<BusinessModel[]> {
    return this.businessModels;
  }

  /**
   * Get integration partners
   */
  async getIntegrationPartners(category?: string): Promise<IntegrationPartner[]> {
    if (category) {
      return this.integrationPartners.filter(p => p.category === category);
    }
    return this.integrationPartners;
  }

  /**
   * Get user's custom profiles
   */
  async getUserCustomProfiles(userId: string): Promise<CustomAIProfile[]> {
    if (!this.db) return [];
    
    return await this.db.customAIProfile.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Get public custom profiles
   */
  async getPublicCustomProfiles(limit: number = 20): Promise<CustomAIProfile[]> {
    if (!this.db) return [];
    
    return await this.db.customAIProfile.findMany({
      where: { isPublic: true },
      orderBy: { updatedAt: 'desc' },
      take: limit
    });
  }

  /**
   * Update custom profile
   */
  async updateCustomProfile(
    profileId: string,
    userId: string,
    updates: Partial<CustomAIProfile>
  ): Promise<CustomAIProfile> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const updated = await this.db.customAIProfile.update({
      where: { 
        id: profileId,
        userId // Ensure user can only update their own profiles
      },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return updated;
  }

  /**
   * Delete custom profile
   */
  async deleteCustomProfile(profileId: string, userId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.customAIProfile.delete({
      where: { 
        id: profileId,
        userId // Ensure user can only delete their own profiles
      }
    });
  }

  /**
   * Clone existing profile
   */
  async cloneProfile(
    sourceProfileId: string,
    userId: string,
    newName: string,
    customizations?: ProfileCustomization[]
  ): Promise<CustomAIProfile> {
    try {
      // Get source profile
      let sourceProfile: AIProfile;
      
      if (sourceProfileId.startsWith('custom-')) {
        const custom = await this.db.customAIProfile.findUnique({
          where: { id: sourceProfileId }
        });
        if (!custom) throw new Error('Source profile not found');
        sourceProfile = custom;
      } else {
        const base = getAIProfile(sourceProfileId);
        if (!base) throw new Error('Source profile not found');
        sourceProfile = base;
      }

      // Apply customizations if provided
      const finalProfile = customizations ? 
        this.applyCustomizations(sourceProfile, customizations) : 
        sourceProfile;

      // Create new custom profile
      const clonedProfile: CustomAIProfile = {
        ...finalProfile,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        isCustom: true,
        isPublic: false,
        tags: [`cloned-from-${sourceProfileId}`],
        useCase: `Cloned from ${sourceProfile.name}`,
        businessModel: 'custom',
        integrations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await this.db.customAIProfile.create({
        data: clonedProfile
      });

      return clonedProfile;
    } catch (error) {
      console.error('Failed to clone profile:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async loadTemplates(): Promise<void> {
    this.templates = [
      {
        id: 'ecommerce-basic',
        name: 'E-commerce Basic',
        description: 'Basic e-commerce AI profile for product management and customer service',
        category: 'ecommerce',
        baseProfile: 'developer',
        customizations: [
          {
            field: 'systemPrompt',
            value: 'You are an AI assistant specialized in e-commerce operations...',
            reason: 'E-commerce specific context',
            impact: 'high'
          },
          {
            field: 'tools',
            value: ['analyze_schema', 'generate_code', 'create_components', 'setup_apis'],
            reason: 'E-commerce specific tools',
            impact: 'medium'
          }
        ],
        isPublic: true,
        usageCount: 0
      },
      {
        id: 'saas-advanced',
        name: 'SaaS Advanced',
        description: 'Advanced SaaS AI profile for complex multi-tenant applications',
        category: 'saas',
        baseProfile: 'architect',
        customizations: [
          {
            field: 'systemPrompt',
            value: 'You are a senior software architect specializing in SaaS applications...',
            reason: 'SaaS specific architecture focus',
            impact: 'high'
          },
          {
            field: 'temperature',
            value: 0.3,
            reason: 'Lower temperature for more consistent architecture decisions',
            impact: 'medium'
          }
        ],
        isPublic: true,
        usageCount: 0
      },
      {
        id: 'fintech-compliant',
        name: 'Fintech Compliant',
        description: 'Fintech AI profile with compliance and security focus',
        category: 'fintech',
        baseProfile: 'architect',
        customizations: [
          {
            field: 'systemPrompt',
            value: 'You are a fintech security architect with expertise in compliance...',
            reason: 'Fintech compliance requirements',
            impact: 'high'
          },
          {
            field: 'tools',
            value: ['analyze_schema', 'validate_relationships', 'optimize_performance', 'security_test'],
            reason: 'Security and compliance tools',
            impact: 'high'
          }
        ],
        isPublic: true,
        usageCount: 0
      }
    ];
  }

  private async loadBusinessModels(): Promise<void> {
    this.businessModels = [
      {
        id: 'b2b-saas',
        name: 'B2B SaaS',
        description: 'Business-to-business software as a service',
        characteristics: ['subscription-based', 'multi-tenant', 'enterprise-focused'],
        aiRequirements: ['user management', 'billing', 'analytics', 'integration'],
        complianceNeeds: ['data protection', 'audit trails', 'access control'],
        integrationPoints: ['payment gateways', 'crm systems', 'analytics platforms']
      },
      {
        id: 'b2c-marketplace',
        name: 'B2C Marketplace',
        description: 'Business-to-consumer marketplace platform',
        characteristics: ['user-generated content', 'payment processing', 'review system'],
        aiRequirements: ['product management', 'order processing', 'customer service'],
        complianceNeeds: ['consumer protection', 'payment security', 'data privacy'],
        integrationPoints: ['payment processors', 'shipping providers', 'review platforms']
      },
      {
        id: 'fintech-platform',
        name: 'Fintech Platform',
        description: 'Financial technology platform',
        characteristics: ['financial transactions', 'regulatory compliance', 'risk management'],
        aiRequirements: ['transaction processing', 'fraud detection', 'compliance monitoring'],
        complianceNeeds: ['PCI DSS', 'SOX', 'AML', 'KYC'],
        integrationPoints: ['banking apis', 'payment networks', 'compliance tools']
      }
    ];
  }

  private async loadIntegrationPartners(): Promise<void> {
    this.integrationPartners = [
      {
        id: 'stripe',
        name: 'Stripe',
        category: 'payment',
        description: 'Payment processing platform',
        capabilities: ['payments', 'subscriptions', 'marketplace', 'connect'],
        apiEndpoints: ['https://api.stripe.com/v1/'],
        documentation: 'https://stripe.com/docs',
        isActive: true
      },
      {
        id: 'sendgrid',
        name: 'SendGrid',
        category: 'communication',
        description: 'Email delivery service',
        capabilities: ['email sending', 'templates', 'analytics', 'deliverability'],
        apiEndpoints: ['https://api.sendgrid.com/v3/'],
        documentation: 'https://docs.sendgrid.com',
        isActive: true
      },
      {
        id: 'aws-s3',
        name: 'AWS S3',
        category: 'storage',
        description: 'Cloud storage service',
        capabilities: ['file storage', 'cdn', 'backup', 'archiving'],
        apiEndpoints: ['https://s3.amazonaws.com/'],
        documentation: 'https://docs.aws.amazon.com/s3',
        isActive: true
      },
      {
        id: 'openai',
        name: 'OpenAI',
        category: 'ai',
        description: 'AI and machine learning platform',
        capabilities: ['text generation', 'embeddings', 'fine-tuning', 'moderation'],
        apiEndpoints: ['https://api.openai.com/v1/'],
        documentation: 'https://platform.openai.com/docs',
        isActive: true
      }
    ];
  }

  private async extractRequirements(useCase: string, context: any): Promise<UseCaseRequirement[]> {
    const requirements: UseCaseRequirement[] = [];

    // Technical requirements
    if (context.technicalComplexity === 'complex') {
      requirements.push({
        id: 'tech-001',
        category: 'technical',
        description: 'Advanced architecture and scalability',
        priority: 'high',
        isRequired: true
      });
    }

    // Business requirements
    if (context.businessModel) {
      const businessModel = this.businessModels.find(bm => bm.id === context.businessModel);
      if (businessModel) {
        businessModel.aiRequirements.forEach((req, index) => {
          requirements.push({
            id: `business-${index}`,
            category: 'business',
            description: req,
            priority: 'medium',
            isRequired: true
          });
        });
      }
    }

    // Compliance requirements
    if (context.compliance && context.compliance.length > 0) {
      context.compliance.forEach((comp: string, index: number) => {
        requirements.push({
          id: `compliance-${index}`,
          category: 'compliance',
          description: `Compliance with ${comp}`,
          priority: 'critical',
          isRequired: true
        });
      });
    }

    // Integration requirements
    if (context.integrations && context.integrations.length > 0) {
      context.integrations.forEach((integration: string, index: number) => {
        requirements.push({
          id: `integration-${index}`,
          category: 'integration',
          description: `Integration with ${integration}`,
          priority: 'medium',
          isRequired: false
        });
      });
    }

    return requirements;
  }

  private async recommendProfiles(requirements: UseCaseRequirement[]): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze requirements and recommend profiles
    const hasCompliance = requirements.some(r => r.category === 'compliance');
    const hasComplexTech = requirements.some(r => r.category === 'technical' && r.priority === 'high');
    const hasIntegration = requirements.some(r => r.category === 'integration');

    if (hasCompliance || hasComplexTech) {
      recommendations.push('architect');
    }

    if (hasIntegration || requirements.some(r => r.category === 'business')) {
      recommendations.push('developer');
    }

    // Always include developer as fallback
    if (!recommendations.includes('developer')) {
      recommendations.push('developer');
    }

    return recommendations;
  }

  private async generateCustomizations(
    requirements: UseCaseRequirement[],
    context: any
  ): Promise<ProfileCustomization[]> {
    const customizations: ProfileCustomization[] = [];

    // Compliance customizations
    const complianceReqs = requirements.filter(r => r.category === 'compliance');
    if (complianceReqs.length > 0) {
      customizations.push({
        field: 'systemPrompt',
        value: 'You are a compliance-focused AI assistant with expertise in regulatory requirements...',
        reason: 'Compliance requirements detected',
        impact: 'high'
      });
    }

    // Technical complexity customizations
    if (context.technicalComplexity === 'complex') {
      customizations.push({
        field: 'temperature',
        value: 0.3,
        reason: 'Lower temperature for complex technical decisions',
        impact: 'medium'
      });
    }

    // Budget-based customizations
    if (context.budget === 'low') {
      customizations.push({
        field: 'maxTokens',
        value: 2000,
        reason: 'Lower token limit for cost optimization',
        impact: 'medium'
      });
    }

    return customizations;
  }

  private async estimateCosts(analysis: UseCaseAnalysis): Promise<{ tokens: number; cost: number }> {
    // Simplified cost estimation
    let baseTokens = 1000;
    let costPerToken = 0.002; // $0.002 per token

    // Adjust based on complexity
    switch (analysis.complexity) {
      case 'simple':
        baseTokens = 500;
        break;
      case 'moderate':
        baseTokens = 1000;
        break;
      case 'complex':
        baseTokens = 2000;
        break;
    }

    // Adjust based on requirements
    baseTokens += analysis.requirements.length * 100;

    const totalTokens = baseTokens;
    const totalCost = totalTokens * costPerToken;

    return { tokens: totalTokens, cost: totalCost };
  }

  private applyCustomizations(baseProfile: AIProfile, customizations: ProfileCustomization[]): AIProfile {
    const customized = { ...baseProfile };

    for (const customization of customizations) {
      (customized as any)[customization.field] = customization.value;
    }

    return customized;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const aiProfileCustomizer = new AIProfileCustomizer();

