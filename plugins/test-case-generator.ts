/**
 * Test Case Generator Plugin
 * Auto-generates comprehensive test cases for entities in schema.zmodel
 * Creates hierarchical test cases with scenario-based execution
 */

import * as fs from 'fs';

interface TestCaseTemplate {
  name: string;
  description: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  expectedResult: string;
  steps: TestStep[];
  validations: Validation[];
  roles: string[];
  parentTestCaseId?: string;
  nextTestCaseId?: string;
  scenario?: string;
}

interface TestStep {
  action: string;
  selector?: string;
  input?: any;
  waitFor?: string;
  assertion?: string;
}

interface Validation {
  type: 'UI' | 'DB' | 'API' | 'UX';
  field?: string;
  expectedValue?: any;
  validationRule?: string;
}

interface ModelConfig {
  name: string;
  fields: FieldConfig[];
  relations: RelationConfig[];
  accessControl: AccessControlConfig;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface FieldConfig {
  name: string;
  type: string;
  required: boolean;
  validation?: ValidationRule[];
}

interface ValidationRule {
  type: string;
  value?: any;
}

interface RelationConfig {
  name: string;
  type: 'oneToMany' | 'manyToOne' | 'oneToOne' | 'manyToMany';
  target: string;
}

interface AccessControlConfig {
  read?: string[];
  create?: string[];
  update?: string[];
  delete?: string[];
}

export class TestCaseGenerator {
  private schemaPath: string;
  private outputPath: string;

  constructor(schemaPath: string, outputPath: string) {
    this.schemaPath = schemaPath;
    this.outputPath = outputPath;
  }

  /**
   * Generate test cases for all models in schema
   */
  async generateAllTestCases(): Promise<TestCaseTemplate[]> {
    const schemaContent = fs.readFileSync(this.schemaPath, 'utf-8');
    const parsedSchema = this.parseSchema(schemaContent);
    
    const models = parsedSchema.models || [];
    const testCases: TestCaseTemplate[] = [];

    for (const model of models) {
      const modelConfig = this.parseModel(model);
      const modelTestCases = this.generateModelTestCases(modelConfig);
      testCases.push(...modelTestCases);
    }

    // Generate hierarchical scenario test cases
    const scenarioTestCases = this.generateScenarioTestCases(testCases);
    testCases.push(...scenarioTestCases);

    return testCases;
  }

  /**
   * Parse schema file into a simplified AST structure
   */
  private parseSchema(schemaContent: string): { models: any[] } {
    const lines = schemaContent.split('\n');
    const models: any[] = [];
    let currentModel: any = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('///')) {
        continue;
      }
      
      // Start of a model
      if (trimmed.startsWith('model ')) {
        if (currentModel) {
          models.push(currentModel);
        }
        const modelName = trimmed.split('model ')[1].split(' ')[0].trim();
        currentModel = {
          name: modelName,
          fields: [],
          attributes: [],
          accessPolicies: [],
        };
      } 
      // End of model
      else if (trimmed === '}' && currentModel) {
        models.push(currentModel);
        currentModel = null;
      }
      // Access control policies
      else if (currentModel && trimmed.includes('@@allow')) {
        const match = trimmed.match(/@@allow\('([^']+)',\s*(.+)\)/);
        if (match) {
          currentModel.accessPolicies.push({
            operation: match[1],
            condition: match[2],
          });
        }
      }
      // Model attributes
      else if (currentModel && trimmed.includes('@@')) {
        const attrName = trimmed.split('@@')[1].split('(')[0].trim();
        currentModel.attributes.push({
          name: attrName,
          args: [],
        });
      }
      // Field definitions
      else if (currentModel && trimmed && !trimmed.startsWith('//')) {
        // Match field patterns like: fieldName Type? @default(...)
        const fieldMatch = trimmed.match(/^\s*(\w+)\s+([^\s@]+?)(\?)?(?:\s|@|$)/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2].trim();
          const isOptional = !!fieldMatch[3];
          
          currentModel.fields.push({
            name: fieldName,
            type: {
              type: this.inferFieldType(fieldType),
              optional: isOptional,
            },
            attributes: [],
          });
        }
      }
    }
    
    if (currentModel) {
      models.push(currentModel);
    }
    
    return { models };
  }

  /**
   * Infer field type from string representation
   */
  private inferFieldType(typeStr: string): string {
    // Handle relation types
    if (typeStr.includes('[') && typeStr.includes(']')) {
      return 'array';
    }
    
    // Map common types
    const typeMap: Record<string, string> = {
      'String': 'string',
      'Int': 'number',
      'Float': 'number',
      'Decimal': 'number',
      'Boolean': 'boolean',
      'DateTime': 'date',
      'Json': 'json',
      'Bytes': 'bytes',
    };
    
    return typeMap[typeStr] || 'string';
  }

  /**
   * Parse model from parsed schema into configuration
   */
  private parseModel(model: any): ModelConfig {
    const fields: FieldConfig[] = (model.fields || []).map((field: any) => ({
      name: field.name,
      type: this.getFieldType(field),
      required: !field.type.optional,
      validation: this.extractValidationRules(field),
    }));

    const relations: RelationConfig[] = [];
    // Extract relations from fields
    (model.fields || []).forEach((field: any) => {
      if (field.type.type === 'relation' || field.name.includes('Id')) {
        // Infer relation from field name ending in Id
        const relationName = field.name.replace(/Id$/, '');
        relations.push({
          name: relationName,
          type: 'manyToOne',
          target: relationName.charAt(0).toUpperCase() + relationName.slice(1),
        });
      }
    });

    const accessControl = this.extractAccessControl(model);

    return {
      name: model.name,
      fields,
      relations,
      accessControl,
      category: this.determineCategory(model.name),
      priority: this.determinePriority(model.name),
    };
  }

  /**
   * Generate test cases for a specific model
   */
  private generateModelTestCases(modelConfig: ModelConfig): TestCaseTemplate[] {
    const testCases: TestCaseTemplate[] = [];

    // 1. CRUD Operations Test Cases
    testCases.push(...this.generateCRUDTestCases(modelConfig));

    // 2. Access Control Test Cases
    testCases.push(...this.generateAccessControlTestCases(modelConfig));

    // 3. Field Validation Test Cases
    testCases.push(...this.generateFieldValidationTestCases(modelConfig));

    // 4. UI/UX Test Cases
    testCases.push(...this.generateUIUXTestCases(modelConfig));

    // 5. Relation Test Cases
    testCases.push(...this.generateRelationTestCases(modelConfig));

    // 6. Edge Case Test Cases
    testCases.push(...this.generateEdgeCaseTestCases(modelConfig));

    return testCases;
  }

  /**
   * Generate CRUD operation test cases
   */
  private generateCRUDTestCases(model: ModelConfig): TestCaseTemplate[] {
    const lowerName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
    const routePath = `/admin/${lowerName}`;
    
    return [
      {
        name: `Create ${model.name} - Success`,
        description: `Verify successful creation of ${model.name} with valid data`,
        category: this.mapCategoryToEnum('CRUD'),
        priority: 'CRITICAL',
        expectedResult: `${model.name} created successfully with all fields populated correctly`,
        steps: [
          {
            action: 'navigate',
            selector: `${routePath}/create`,
          },
          ...this.generateFormFillSteps(model),
          {
            action: 'click',
            selector: 'button[type="submit"]',
          },
          {
            action: 'waitFor',
            waitFor: 'success',
          },
        ],
        validations: [
          { type: 'UI', expectedValue: 'success message' },
          { type: 'DB', field: 'id', validationRule: 'exists' },
          ...this.generateFieldValidations(model),
        ],
        roles: model.accessControl.create || ['ADMIN'],
        scenario: `${model.name}_CRUD_Flow`,
      },
      {
        name: `Read ${model.name} - List View`,
        description: `Verify ${model.name} list page displays correctly`,
        category: this.mapCategoryToEnum('CRUD'),
        priority: 'HIGH',
        expectedResult: `List page displays all ${model.name} records with pagination`,
        steps: [
          {
            action: 'navigate',
            selector: routePath,
          },
          {
            action: 'waitFor',
            waitFor: 'table',
          },
        ],
        validations: [
          { type: 'UI', expectedValue: 'table visible' },
          { type: 'UI', expectedValue: 'pagination controls' },
          { type: 'API', validationRule: 'returns array' },
        ],
        roles: model.accessControl.read || ['ADMIN'],
        scenario: `${model.name}_CRUD_Flow`,
      },
      {
        name: `Update ${model.name} - Success`,
        description: `Verify successful update of ${model.name}`,
        category: this.mapCategoryToEnum('CRUD'),
        priority: 'CRITICAL',
        expectedResult: `${model.name} updated successfully with new values`,
        steps: [
          {
            action: 'navigate',
            selector: routePath,
          },
          {
            action: 'click',
            selector: 'button[data-action="edit"]',
          },
          ...this.generateFormFillSteps(model, true),
          {
            action: 'click',
            selector: 'button[type="submit"]',
          },
          {
            action: 'waitFor',
            waitFor: 'success',
          },
        ],
        validations: [
          { type: 'UI', expectedValue: 'success message' },
          { type: 'DB', validationRule: 'values updated' },
        ],
        roles: model.accessControl.update || ['ADMIN'],
        scenario: `${model.name}_CRUD_Flow`,
      },
      {
        name: `Delete ${model.name} - Success`,
        description: `Verify successful deletion of ${model.name}`,
        category: this.mapCategoryToEnum('CRUD'),
        priority: 'HIGH',
        expectedResult: `${model.name} deleted successfully`,
        steps: [
          {
            action: 'navigate',
            selector: routePath,
          },
          {
            action: 'click',
            selector: 'button[data-action="delete"]',
          },
          {
            action: 'click',
            selector: 'button[data-confirm="yes"]',
          },
          {
            action: 'waitFor',
            waitFor: 'success',
          },
        ],
        validations: [
          { type: 'UI', expectedValue: 'success message' },
          { type: 'DB', validationRule: 'record deleted' },
        ],
        roles: model.accessControl.delete || ['ADMIN'],
        scenario: `${model.name}_CRUD_Flow`,
      },
    ];
  }

  /**
   * Generate access control test cases
   */
  private generateAccessControlTestCases(model: ModelConfig): TestCaseTemplate[] {
    const testCases: TestCaseTemplate[] = [];
    const roles = ['CUSTOMER', 'VENDOR', 'ADMIN', 'MODERATOR'];
    
    for (const role of roles) {
      const hasAccess = this.checkRoleAccess(model, role);
      
      testCases.push({
        name: `${model.name} - ${role} Access Control`,
        description: `Verify ${role} user has correct access to ${model.name}`,
        category: this.mapCategoryToEnum('Access Control'),
        priority: 'CRITICAL',
        expectedResult: hasAccess ? `${role} can perform allowed operations` : `${role} cannot access ${model.name}`,
        steps: [
          {
            action: 'setRole',
            input: role,
          },
          {
            action: 'navigate',
            selector: `/admin/${model.name.toLowerCase()}`,
          },
          {
            action: 'waitFor',
            waitFor: 'response',
          },
        ],
        validations: [
          { type: 'API', expectedValue: hasAccess ? 200 : 403 },
          { type: 'UI', expectedValue: hasAccess ? 'page visible' : 'access denied' },
        ],
        roles: [role],
        scenario: `${model.name}_Access_Control`,
      });
    }

    return testCases;
  }

  /**
   * Generate field validation test cases
   */
  private generateFieldValidationTestCases(model: ModelConfig): TestCaseTemplate[] {
    const testCases: TestCaseTemplate[] = [];
    
    for (const field of model.fields) {
      if (field.required) {
        testCases.push({
          name: `${model.name} - ${field.name} Required Validation`,
          description: `Verify ${field.name} field is required`,
          category: this.mapCategoryToEnum('Validation'),
          priority: 'HIGH',
          expectedResult: `Form shows validation error when ${field.name} is empty`,
          steps: [
            {
              action: 'navigate',
              selector: `/admin/${model.name.toLowerCase()}/create`,
            },
            {
              action: 'skip',
              selector: `input[name="${field.name}"]`,
            },
            {
              action: 'click',
              selector: 'button[type="submit"]',
            },
          ],
          validations: [
            { type: 'UI', expectedValue: 'validation error' },
            { type: 'UX', field: field.name, validationRule: 'required' },
          ],
          roles: ['ADMIN'],
          scenario: `${model.name}_Validation`,
        });
      }

      // Generate validation rules test cases
      if (field.validation) {
        for (const rule of field.validation) {
          testCases.push({
            name: `${model.name} - ${field.name} ${rule.type} Validation`,
            description: `Verify ${field.name} validates ${rule.type} rule`,
            category: this.mapCategoryToEnum('Validation'),
            priority: 'MEDIUM',
            expectedResult: `Form shows validation error for invalid ${field.name}`,
            steps: [
              {
                action: 'navigate',
                selector: `/admin/${model.name.toLowerCase()}/create`,
              },
              {
                action: 'fill',
                selector: `input[name="${field.name}"]`,
                input: this.generateInvalidValue(field.type, rule),
              },
              {
                action: 'click',
                selector: 'button[type="submit"]',
              },
            ],
            validations: [
              { type: 'UX', field: field.name, validationRule: rule.type },
            ],
            roles: ['ADMIN'],
            scenario: `${model.name}_Validation`,
          });
        }
      }
    }

    return testCases;
  }

  /**
   * Generate UI/UX test cases
   */
  private generateUIUXTestCases(model: ModelConfig): TestCaseTemplate[] {
    const lowerName = model.name.toLowerCase();
    
    return [
      {
        name: `${model.name} - Page Load Performance`,
        description: `Verify ${model.name} page loads within acceptable time`,
        category: this.mapCategoryToEnum('UX'),
        priority: 'MEDIUM',
        expectedResult: `Page loads within 2 seconds`,
        steps: [
          {
            action: 'navigate',
            selector: `/admin/${lowerName}`,
          },
          {
            action: 'measure',
            waitFor: 'load',
          },
        ],
        validations: [
          { type: 'UX', validationRule: 'loadTime < 2000ms' },
        ],
        roles: ['ADMIN'],
        scenario: `${model.name}_Performance`,
      },
      {
        name: `${model.name} - Responsive Design`,
        description: `Verify ${model.name} page is responsive on mobile`,
        category: this.mapCategoryToEnum('UX'),
        priority: 'MEDIUM',
        expectedResult: `Page displays correctly on mobile viewport`,
        steps: [
          {
            action: 'setViewport',
            input: { width: 375, height: 667 },
          },
          {
            action: 'navigate',
            selector: `/admin/${lowerName}`,
          },
        ],
        validations: [
          { type: 'UX', expectedValue: 'mobile layout' },
        ],
        roles: ['ADMIN'],
        scenario: `${model.name}_Responsive`,
      },
      {
        name: `${model.name} - Dark Mode Support`,
        description: `Verify ${model.name} page supports dark mode`,
        category: this.mapCategoryToEnum('UX'),
        priority: 'LOW',
        expectedResult: `Page displays correctly in dark mode`,
        steps: [
          {
            action: 'setTheme',
            input: 'dark',
          },
          {
            action: 'navigate',
            selector: `/admin/${lowerName}`,
          },
        ],
        validations: [
          { type: 'UX', expectedValue: 'dark mode active' },
        ],
        roles: ['ADMIN'],
        scenario: `${model.name}_Theme`,
      },
    ];
  }

  /**
   * Generate relation test cases
   */
  private generateRelationTestCases(model: ModelConfig): TestCaseTemplate[] {
    const testCases: TestCaseTemplate[] = [];
    
    for (const relation of model.relations) {
      testCases.push({
        name: `${model.name} - ${relation.name} Relation`,
        description: `Verify ${relation.name} relation works correctly`,
        category: this.mapCategoryToEnum('Relations'),
        priority: 'HIGH',
        expectedResult: `${relation.name} relation displays and updates correctly`,
        steps: [
          {
            action: 'navigate',
            selector: `/admin/${model.name.toLowerCase()}/create`,
          },
          {
            action: 'select',
            selector: `select[name="${relation.name}"]`,
            input: 'valid-relation-id',
          },
          {
            action: 'click',
            selector: 'button[type="submit"]',
          },
        ],
        validations: [
          { type: 'DB', field: relation.name, validationRule: 'relation exists' },
        ],
        roles: ['ADMIN'],
        scenario: `${model.name}_Relations`,
      });
    }

    return testCases;
  }

  /**
   * Generate edge case test cases
   */
  private generateEdgeCaseTestCases(model: ModelConfig): TestCaseTemplate[] {
    return [
      {
        name: `${model.name} - Empty State`,
        description: `Verify ${model.name} handles empty state correctly`,
        category: this.mapCategoryToEnum('Edge Cases'),
        priority: 'MEDIUM',
        expectedResult: `Empty state message displays when no records exist`,
        steps: [
          {
            action: 'navigate',
            selector: `/admin/${model.name.toLowerCase()}`,
          },
          {
            action: 'waitFor',
            waitFor: 'empty state',
          },
        ],
        validations: [
          { type: 'UI', expectedValue: 'empty state message' },
        ],
        roles: ['ADMIN'],
        scenario: `${model.name}_Edge_Cases`,
      },
      {
        name: `${model.name} - Large Dataset`,
        description: `Verify ${model.name} handles large datasets with pagination`,
        category: this.mapCategoryToEnum('Edge Cases'),
        priority: 'MEDIUM',
        expectedResult: `Pagination works correctly with large datasets`,
        steps: [
          {
            action: 'navigate',
            selector: `/admin/${model.name.toLowerCase()}`,
          },
          {
            action: 'waitFor',
            waitFor: 'pagination',
          },
          {
            action: 'click',
            selector: 'button[data-page="next"]',
          },
        ],
        validations: [
          { type: 'UI', expectedValue: 'page 2 loaded' },
          { type: 'API', validationRule: 'pagination works' },
        ],
        roles: ['ADMIN'],
        scenario: `${model.name}_Edge_Cases`,
      },
    ];
  }

  /**
   * Map category string to valid TestCategory enum value
   */
  private mapCategoryToEnum(category: string): string {
    const categoryMap: Record<string, string> = {
      'CRUD': 'API',
      'Access Control': 'SECURITY',
      'Validation': 'API',
      'UX': 'UI',
      'Relations': 'DATABASE',
      'Edge Cases': 'API',
      'Scenarios': 'API',
      'Page Load': 'UI',
      'Functionality': 'API',
      'Property': 'MARKETPLACE',
      'Property Management': 'MARKETPLACE',
      'Authentication': 'AUTHENTICATION',
      'User Management': 'AUTHENTICATION',
      'General': 'API',
    };

    // Check if category is already a valid enum value
    const validEnums = [
      'AUTHENTICATION', 'MARKETPLACE', 'INVESTMENT', 'GAMING', 'BLOCKCHAIN',
      'API', 'UI', 'DATABASE', 'SECURITY', 'PERFORMANCE', 'PAYMENT',
      'NOTIFICATION', 'DOCUMENTATION'
    ];
    
    if (validEnums.includes(category.toUpperCase())) {
      return category.toUpperCase();
    }

    // Map to enum value
    return categoryMap[category] || 'API';
  }

  /**
   * Generate hierarchical scenario test cases
   */
  private generateScenarioTestCases(baseTestCases: TestCaseTemplate[]): TestCaseTemplate[] {
    const scenarioTestCases: TestCaseTemplate[] = [];
    
    // Group test cases by scenario
    const scenarioGroups = new Map<string, TestCaseTemplate[]>();
    
    for (const testCase of baseTestCases) {
      if (testCase.scenario) {
        if (!scenarioGroups.has(testCase.scenario)) {
          scenarioGroups.set(testCase.scenario, []);
        }
        scenarioGroups.get(testCase.scenario)!.push(testCase);
      }
    }

    // Create linked-list scenario test cases
    for (const [scenarioName, testCases] of scenarioGroups) {
      // Sort test cases by priority and order
      const sortedTests = testCases.sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Link test cases together
      for (let i = 0; i < sortedTests.length; i++) {
        if (i > 0) {
          sortedTests[i].parentTestCaseId = sortedTests[i - 1].name;
        }
        if (i < sortedTests.length - 1) {
          sortedTests[i].nextTestCaseId = sortedTests[i + 1].name;
        }
      }

      // Create scenario execution test case
      scenarioTestCases.push({
        name: `${scenarioName} - Complete Flow`,
        description: `Execute complete ${scenarioName} scenario with all steps`,
        category: this.mapCategoryToEnum('Scenarios'),
        priority: 'CRITICAL',
        expectedResult: `All steps in ${scenarioName} scenario execute successfully in sequence`,
        steps: [
          {
            action: 'executeScenario',
            input: scenarioName,
          },
        ],
        validations: [
          { type: 'DB', validationRule: 'all steps completed' },
          { type: 'UI', expectedValue: 'scenario complete' },
        ],
        roles: ['ADMIN'],
        scenario: scenarioName,
        parentTestCaseId: sortedTests[0]?.name,
      });
    }

    return scenarioTestCases;
  }

  // Helper methods
  private getFieldType(field: any): string {
    return field.type?.type || 'string';
  }

  private getRelationType(field: any): 'oneToMany' | 'manyToOne' | 'oneToOne' | 'manyToMany' {
    // Simplified - would need to check relation attributes
    return 'manyToOne';
  }

  private extractValidationRules(field: any): ValidationRule[] {
    const rules: ValidationRule[] = [];
    // Extract validation rules from field attributes if available
    if (field.attributes) {
      // Process attributes to extract validation rules
      // This is a simplified implementation
    }
    return rules;
  }

  private extractAccessControl(model: any): AccessControlConfig {
    const config: AccessControlConfig = {};
    
    // Extract @@allow rules from model access policies
    if (model.accessPolicies) {
      for (const policy of model.accessPolicies) {
        const operation = policy.operation.toLowerCase();
        if (!config[operation as keyof AccessControlConfig]) {
          config[operation as keyof AccessControlConfig] = [];
        }
        // Extract roles from condition - simplified
        if (policy.condition.includes('role')) {
          const roleMatch = policy.condition.match(/role\s*==\s*['"]([^'"]+)['"]/);
          if (roleMatch) {
            (config[operation as keyof AccessControlConfig] as string[]).push(roleMatch[1].toUpperCase());
          }
        }
      }
    }
    
    return config;
  }

  private determineCategory(modelName: string): string {
    // Categorize based on model name patterns
    if (modelName.includes('User')) return 'User Management';
    if (modelName.includes('Property') || modelName.includes('RealEstate')) return 'Property Management';
    if (modelName.includes('Token')) return 'Tokenization';
    if (modelName.includes('Order') || modelName.includes('Payment')) return 'Transactions';
    return 'General';
  }

  private determinePriority(modelName: string): 'critical' | 'high' | 'medium' | 'low' {
    const criticalModels = ['User', 'Property', 'Investment', 'Payment'];
    if (criticalModels.some(m => modelName.includes(m))) return 'critical';
    return 'high';
  }

  private generateFormFillSteps(model: ModelConfig, isUpdate: boolean = false): TestStep[] {
    const steps: TestStep[] = [];
    
    for (const field of model.fields) {
      if (field.type !== 'relation') {
        steps.push({
          action: 'fill',
          selector: `input[name="${field.name}"]`,
          input: this.generateTestValue(field.type),
        });
      }
    }
    
    return steps;
  }

  private generateTestValue(type: string): any {
    const generators: Record<string, () => any> = {
      string: () => 'Test Value',
      email: () => 'test@example.com',
      number: () => 123,
      boolean: () => true,
      date: () => new Date().toISOString(),
    };
    
    return generators[type]?.() || 'test';
  }

  private generateInvalidValue(type: string, rule: ValidationRule): any {
    if (rule.type === 'email') return 'invalid-email';
    if (rule.type === 'min') return '';
    return 'invalid';
  }

  private generateFieldValidations(model: ModelConfig): Validation[] {
    return model.fields.map(field => ({
      type: 'DB' as const,
      field: field.name,
      validationRule: 'value matches input',
    }));
  }

  private checkRoleAccess(model: ModelConfig, role: string): boolean {
    const allRoles = [
      ...(model.accessControl.read || []),
      ...(model.accessControl.create || []),
      ...(model.accessControl.update || []),
      ...(model.accessControl.delete || []),
    ];
    return allRoles.includes(role) || role === 'ADMIN';
  }
}

