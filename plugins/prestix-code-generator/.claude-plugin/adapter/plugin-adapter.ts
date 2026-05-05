/**
 * Prestix Claude Plugin Adapter
 *
 * Bridges Claude Plugin interface to existing ZenStack plugin system
 * Allows Claude to invoke your existing generators through MCP
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export interface GenerationRequest {
  entityName?: string;
  operation?: 'api' | 'components' | 'hooks' | 'types' | 'navigation' | 'all';
  options?: {
    force?: boolean;
    dryRun?: boolean;
    form?: boolean;
    table?: boolean;
    card?: boolean;
    modal?: boolean;
  };
}

export interface GenerationResponse {
  success: boolean;
  message: string;
  filesGenerated?: string[];
  errors?: string[];
  details?: any;
}

export interface SchemaAnalysis {
  entities: EntityInfo[];
  relationships: RelationshipInfo[];
  statistics: {
    totalEntities: number;
    totalFields: number;
    totalRelations: number;
  };
  recommendations: string[];
}

export interface EntityInfo {
  name: string;
  fields: FieldInfo[];
  relations: string[];
  operations: string[];
  hasAccessControl: boolean;
}

export interface FieldInfo {
  name: string;
  type: string;
  isOptional: boolean;
  isUnique?: boolean;
  isPrimary?: boolean;
}

export interface RelationshipInfo {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

export class PluginAdapter {
  private projectRoot: string;
  private pluginsDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.pluginsDir = join(projectRoot, 'plugins');

    this.validateSetup();
  }

  private validateSetup(): void {
    const requiredDirs = [
      join(this.projectRoot, 'plugins'),
      join(this.projectRoot, 'plugins/utils'),
      join(this.projectRoot, 'plugins/templates'),
      join(this.projectRoot, 'plugins/config'),
    ];

    for (const dir of requiredDirs) {
      if (!existsSync(dir)) {
        throw new Error(`Missing required directory: ${dir}`);
      }
    }
  }

  /**
   * Find ZenStack schema file using discovery (matches app-state-sync-generator)
   */
  private findSchemaPath(): string {
    const candidates = [
      join(this.projectRoot, 'zenstack.zmodel'),
      join(this.projectRoot, 'zenstack/schema.zmodel'),
      join(this.projectRoot, 'schema.zmodel'),
      join(this.projectRoot, 'prisma/schema.zmodel'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    return join(this.projectRoot, 'zenstack/schema.zmodel');
  }

  /**
   * Generate code for an entity
   * Bridges to your enhanced-auto-generator.ts
   */
  async generateEntity(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const { entityName, operation = 'all', options = {} } = request;

      if (!entityName) {
        return {
          success: false,
          message: 'Entity name is required',
          errors: ['No entity specified']
        };
      }

      // Validate entity exists in schema
      const schemaAnalysis = await this.analyzeSchema();
      const entity = schemaAnalysis.entities.find(e => e.name === entityName);

      if (!entity) {
        return {
          success: false,
          message: `Entity '${entityName}' not found in schema`,
          errors: [`Available entities: ${schemaAnalysis.entities.map(e => e.name).join(', ')}`]
        };
      }

      // Build command based on operation type
      let command = `tsx ${join(this.pluginsDir, 'enhanced-auto-generator.ts')}`;

      switch (operation) {
        case 'api':
          command += ' api';
          break;
        case 'components':
          command += ' components';
          break;
        case 'hooks':
          command += ' hooks';
          break;
        case 'types':
          command += ' types';
          break;
        case 'navigation':
          command += ' navigation';
          break;
        case 'all':
        default:
          command += ' all';
      }

      // Add options
      if (options.force) command += ' --force';
      if (options.dryRun) command += ' --dry-run';

      // Execute generation
      const { stdout, stderr } = await execAsync(command, { cwd: this.projectRoot });

      if (stderr && !stderr.includes('DEBUG')) {
        return {
          success: false,
          message: 'Generation failed',
          errors: [stderr]
        };
      }

      // Parse output to extract generated files
      const filesGenerated = this.parseGeneratedFiles(stdout);

      return {
        success: true,
        message: `Successfully generated ${operation} for ${entityName}`,
        filesGenerated,
        details: {
          entity: entityName,
          operation,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Analyze the ZenStack schema
   * Bridges to your schema analysis logic
   */
  async analyzeSchema(): Promise<SchemaAnalysis> {
    try {
      const schemaPath = this.findSchemaPath();

      if (!existsSync(schemaPath)) {
        return {
          entities: [],
          relationships: [],
          statistics: {
            totalEntities: 0,
            totalFields: 0,
            totalRelations: 0
          },
          recommendations: [
            'No ZenStack schema found. Check: zenstack.zmodel, zenstack/schema.zmodel, schema.zmodel, prisma/schema.zmodel'
          ]
        };
      }

      const schemaContent = readFileSync(schemaPath, 'utf-8');

      // Parse schema to extract entities
      const entities = this.parseEntities(schemaContent);
      const relationships = this.parseRelationships(schemaContent);

      return {
        entities,
        relationships,
        statistics: {
          totalEntities: entities.length,
          totalFields: entities.reduce((sum, e) => sum + e.fields.length, 0),
          totalRelations: relationships.length
        },
        recommendations: this.generateRecommendations(entities, relationships)
      };
    } catch (error) {
      return {
        entities: [],
        relationships: [],
        statistics: {
          totalEntities: 0,
          totalFields: 0,
          totalRelations: 0
        },
        recommendations: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Synchronize app state with templates
   * Bridges to your app-state-sync-generator.ts
   */
  async syncAppState(): Promise<GenerationResponse> {
    try {
      const command = `tsx ${join(this.pluginsDir, 'index.ts')} sync-app-state`;
      const { stdout, stderr } = await execAsync(command, { cwd: this.projectRoot });

      if (stderr) {
        return {
          success: false,
          message: 'Sync failed',
          errors: [stderr]
        };
      }

      return {
        success: true,
        message: 'App state synchronized successfully',
        details: stdout
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Validate ZenStack schema
   */
  async validateSchema(): Promise<GenerationResponse> {
    try {
      const schemaPath = this.findSchemaPath();

      if (!existsSync(schemaPath)) {
        return {
          success: false,
          message: 'Schema file not found',
          errors: [
            'No ZenStack schema found. Check: zenstack.zmodel, zenstack/schema.zmodel, schema.zmodel, prisma/schema.zmodel'
          ]
        };
      }

      const schemaContent = readFileSync(schemaPath, 'utf-8');

      // Basic validation
      const errors: string[] = [];

      if (!schemaContent.includes('model')) {
        errors.push('No models defined in schema');
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Schema validation failed',
          errors
        };
      }

      return {
        success: true,
        message: 'Schema is valid'
      };
    } catch (error) {
      return {
        success: false,
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Get template catalog
   */
  getTemplateCatalog(): Record<string, string[]> {
    try {
      const templatesDir = join(this.pluginsDir, 'templates');
      const configPath = join(this.pluginsDir, 'config', 'template-mappings.json');

      if (existsSync(configPath)) {
        const mappings = JSON.parse(readFileSync(configPath, 'utf-8'));
        return mappings;
      }

      // Fallback: return template files
      return {
        'api': ['route-template.ts'],
        'components': ['component-template.tsx', 'form-template.tsx', 'table-template.tsx'],
        'hooks': ['hook-template.ts'],
        'types': ['type-template.ts'],
        'stores': ['store-template.ts']
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Parse entities from schema content
   */
  private parseEntities(schemaContent: string): EntityInfo[] {
    const entities: EntityInfo[] = [];
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const name = match[1];
      const body = match[2];

      const fields = this.parseFields(body);
      const relations = this.parseRelations(body);
      const hasAccessControl = body.includes('@@allow') || body.includes('@@deny');

      entities.push({
        name,
        fields,
        relations,
        operations: ['create', 'read', 'update', 'delete', 'list'],
        hasAccessControl
      });
    }

    return entities;
  }

  /**
   * Parse fields from model body
   */
  private parseFields(modelBody: string): FieldInfo[] {
    const fields: FieldInfo[] = [];
    const fieldRegex = /(\w+)\s+(\w+)[\?@]?/g;
    let match;

    while ((match = fieldRegex.exec(modelBody)) !== null) {
      const [, name, type] = match;

      if (!['model', 'enum', '@@'].includes(name)) {
        fields.push({
          name,
          type,
          isOptional: modelBody.includes(`${name}?`),
          isPrimary: modelBody.includes(`${name} @@id`)
        });
      }
    }

    return fields;
  }

  /**
   * Parse relations from model body
   */
  private parseRelations(modelBody: string): string[] {
    const relations: string[] = [];
    const relationRegex = /(\w+)\s+(\w+)\[\]?/g;
    let match;

    while ((match = relationRegex.exec(modelBody)) !== null) {
      const [, name, type] = match;
      if (type.match(/^[A-Z]/)) {
        relations.push(name);
      }
    }

    return relations;
  }

  /**
   * Parse relationships from schema
   */
  private parseRelationships(schemaContent: string): RelationshipInfo[] {
    const relationships: RelationshipInfo[] = [];
    // This would need more sophisticated parsing based on your schema structure
    return relationships;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    entities: EntityInfo[],
    relationships: RelationshipInfo[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommend generation for critical entities
    const criticalPatterns = ['User', 'Product', 'Order', 'Account'];
    for (const entity of entities) {
      if (criticalPatterns.some(p => entity.name.includes(p))) {
        recommendations.push(`Generate full interface for ${entity.name}: /generate ${entity.name} --all`);
      }
    }

    // Recommend sync if many relationships
    if (relationships.length > 5) {
      recommendations.push('Many relationships detected, run /sync-state to update templates');
    }

    // Recommend access control
    const missingAccessControl = entities.filter(e => !e.hasAccessControl);
    if (missingAccessControl.length > 0) {
      recommendations.push(`Add access control rules to: ${missingAccessControl.map(e => e.name).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Parse generated files from output
   */
  private parseGeneratedFiles(output: string): string[] {
    const files: string[] = [];
    const fileRegex = /Generated.*?\/(.+?)\.(ts|tsx)/g;
    let match;

    while ((match = fileRegex.exec(output)) !== null) {
      files.push(match[1]);
    }

    return files.length > 0 ? files : ['Generated files successfully'];
  }
}

// Export singleton instance
export const pluginAdapter = new PluginAdapter();
