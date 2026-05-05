/**
 * Schema Type Mapper Utility
 * Maps ZModel field types to Zod validation schema types
 */

import { readFileSync } from 'fs';

export interface FieldTypeInfo {
  name: string;
  zodType: string;
  isOptional: boolean;
  isEnum: boolean;
  enumValues?: string[];
}

/**
 * Maps ZModel scalar types to Zod types
 */
function mapZModelTypeToZod(zmodelType: string, isEnum: boolean = false): string {
  if (isEnum) {
    return 'z.enum'; // Will be handled separately with enum values
  }

  const typeMap: Record<string, string> = {
    'String': 'z.string()',
    'Int': 'z.number().int()',
    'Float': 'z.number()',
    'Decimal': 'z.number()',
    'Boolean': 'z.boolean()',
    'DateTime': 'z.string().datetime()',
    'Json': 'z.any()',
    'Bytes': 'z.string()', // Base64 encoded
  };

  return typeMap[zmodelType] || 'z.string()';
}

/**
 * Parse schema file to extract field types for a specific model
 */
export function getModelFieldTypes(modelName: string, schemaPath: string = 'zenstack/schema.zmodel'): Map<string, FieldTypeInfo> {
  const fieldTypes = new Map<string, FieldTypeInfo>();
  
  try {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    
    // Parse enums first
    const enums = new Map<string, string[]>();
    const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/gs;
    let enumMatch;
    while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
      const enumName = enumMatch[1];
      const enumBody = enumMatch[2];
      const values = enumBody
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//') && !line.startsWith('@@'))
        .map(line => line.replace(/,.*$/, '').trim());
      enums.set(enumName, values);
    }
    
    // Find the model
    const modelRegex = new RegExp(`model\\s+${modelName}\\s*{([^}]+)}`, 's');
    const modelMatch = schemaContent.match(modelRegex);
    
    if (!modelMatch) {
      // Only log warning in development mode and for models that aren't known to be missing
      // These blockchain models exist as Zod schemas but not in ZenStack schema
      const knownMissingModels = [
        'BlockchainContract',
        'TokenizedAsset',
        'ContractCall',
        'DataSyncConfig',
        'GovernanceProposal',
        'BlockchainBalance'
      ];
      
      if (!knownMissingModels.includes(modelName) && process.env.NODE_ENV === 'development') {
        console.warn(`Model ${modelName} not found in schema`);
      }
      return fieldTypes;
    }
    
    const modelBody = modelMatch[1];
    const lines = modelBody.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      
      // Match field pattern: fieldName Type? @attributes
      const fieldMatch = /^(\w+)\s+(\w+)(\[\])?(\?)?/.exec(trimmed);
      if (fieldMatch) {
        const [, name, type, isArray, isOptional] = fieldMatch;
        
        // Skip relations (capitalized types that aren't enums or scalars)
        const scalarTypes = ['String', 'Int', 'Boolean', 'DateTime', 'Float', 'Decimal', 'Json', 'Bytes'];
        const isEnum = enums.has(type);
        const isRelation = !isEnum && type[0] === type[0].toUpperCase() && !scalarTypes.includes(type);
        
        if (isRelation) {
          continue;
        }
        
        const enumValues = isEnum ? enums.get(type) : undefined;
        const zodType = mapZModelTypeToZod(type, isEnum);
        
        fieldTypes.set(name, {
          name,
          zodType,
          isOptional: !!isOptional,
          isEnum,
          enumValues
        });
      }
    }
  } catch (error) {
    console.error(`Error parsing schema for model ${modelName}:`, error);
  }
  
  return fieldTypes;
}

/**
 * Get Zod schema string for a field
 */
export function getZodSchemaForField(fieldInfo: FieldTypeInfo, isRequired: boolean = false): string {
  if (fieldInfo.isEnum && fieldInfo.enumValues) {
    const enumValues = fieldInfo.enumValues.map(v => `'${v}'`).join(', ');
    return `z.enum([${enumValues}])${isRequired ? '' : '.optional()'}`;
  }
  
  return `${fieldInfo.zodType}${isRequired ? '' : '.optional()'}`;
}

/**
 * Fallback field type mapping based on common field name patterns
 * Used when schema parsing fails
 */
export function getFieldTypeFromName(fieldName: string): string {
  const numericFields = ['price', 'costPrice', 'comparePrice', 'inventory', 'quantity', 'amount', 'totalAmount', 
    'subtotal', 'taxAmount', 'shippingAmount', 'rating', 'loyaltyPoints', 'totalSpent', 'balance', 
    'tokenAmount', 'totalTokens', 'soldTokens', 'availableTokens', 'tokenPrice'];
  
  const booleanFields = ['isActive', 'isPremium', 'isVerified', 'isApproved', 'isDefault', 'isPublic', 
    'isPublished', 'published', 'active', 'verified', 'approved'];
  
  const dateFields = ['createdAt', 'updatedAt', 'publishedAt', 'deletedAt', 'expiresAt', 'startDate', 'endDate'];
  
  if (numericFields.includes(fieldName)) {
    return 'z.number()';
  }
  
  if (booleanFields.includes(fieldName)) {
    return 'z.boolean()';
  }
  
  if (dateFields.includes(fieldName)) {
    return 'z.string().datetime()';
  }
  
  return 'z.string()';
}

