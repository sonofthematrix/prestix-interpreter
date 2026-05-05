/**
 * Content Field Detection Utility
 * Detects which fields should use the enhanced content editor
 */

export interface ContentFieldConfig {
  fieldName: string;
  isLongText: boolean;
  isMarkdown: boolean;
  minHeight: number;
  maxHeight: number;
  enableAI: boolean;
  enablePreview: boolean;
  enableAutoSave: boolean;
}

/**
 * Field names that typically contain large text content
 */
const CONTENT_FIELD_NAMES = new Set([
  'content',
  'description',
  'excerpt',
  'summary',
  'body',
  'text',
  'details',
  'notes',
  'bio',
  'about',
  'message',
  'comment',
  'review',
  'feedback',
  'instructions',
  'requirements',
  'specification',
  'documentation',
  'readme',
  'changelog',
  'announcement',
  'article',
  'post',
  'story',
  'narrative'
]);

/**
 * Field names that typically contain markdown content
 */
const MARKDOWN_FIELD_NAMES = new Set([
  'content',
  'description',
  'body',
  'details',
  'documentation',
  'readme',
  'changelog',
  'article',
  'post',
  'instructions',
  'specification'
]);

/**
 * Model names that typically have content fields requiring enhanced editing
 */
const CONTENT_MODELS = new Set([
  'BlogPost',
  'Documentation',
  'Article',
  'Post',
  'Page',
  'Comment',
  'Review',
  'Announcement',
  'News',
  'Tutorial',
  'Guide',
  'FAQ',
  'Help',
  'Support',
  'Ticket',
  'Message',
  'Email',
  'Newsletter',
  'Product', // for product descriptions
  'Service', // for service descriptions
  'Portfolio', // for portfolio descriptions
  'Project', // for project descriptions
  'Case', // for case studies
  'Testimonial',
  'Story',
  'Biography',
  'Profile'
]);

/**
 * Detect if a field should use the enhanced content editor
 */
export function isContentField(
  fieldName: string, 
  fieldType: string, 
  modelName: string
): boolean {
  // Must be a string type
  if (fieldType !== 'String') {
    return false;
  }

  // Check if field name matches content patterns
  const lowerFieldName = fieldName.toLowerCase();
  if (CONTENT_FIELD_NAMES.has(lowerFieldName)) {
    return true;
  }

  // Check if model is a content model and field could be content
  if (CONTENT_MODELS.has(modelName)) {
    // Additional patterns for content models
    if (lowerFieldName.includes('content') || 
        lowerFieldName.includes('description') || 
        lowerFieldName.includes('text') ||
        lowerFieldName.includes('body')) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if a field should support markdown
 */
export function isMarkdownField(fieldName: string, modelName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  
  // Check explicit markdown field names
  if (MARKDOWN_FIELD_NAMES.has(lowerFieldName)) {
    return true;
  }

  // Content models typically use markdown
  if (CONTENT_MODELS.has(modelName) && 
      (lowerFieldName === 'content' || lowerFieldName === 'body')) {
    return true;
  }

  return false;
}

/**
 * Get content field configuration for a specific field
 */
export function getContentFieldConfig(
  fieldName: string, 
  fieldType: string, 
  modelName: string
): ContentFieldConfig | null {
  if (!isContentField(fieldName, fieldType, modelName)) {
    return null;
  }

  const lowerFieldName = fieldName.toLowerCase();
  const isMarkdown = isMarkdownField(fieldName, modelName);
  
  // Determine field characteristics
  let minHeight = 200;
  let maxHeight = 400;
  let enableAI = false;
  let enablePreview = isMarkdown;
  let enableAutoSave = false;

  // Adjust based on field name
  if (lowerFieldName === 'content' || lowerFieldName === 'body') {
    minHeight = 500;
    maxHeight = 1000;
    enableAI = true;
    enableAutoSave = true;
  } else if (lowerFieldName === 'description' || lowerFieldName === 'details') {
    minHeight = 300;
    maxHeight = 600;
    enableAI = true;
  } else if (lowerFieldName === 'excerpt' || lowerFieldName === 'summary') {
    minHeight = 150;
    maxHeight = 300;
    enableAI = true;
  } else if (lowerFieldName === 'bio' || lowerFieldName === 'about') {
    minHeight = 200;
    maxHeight = 400;
    enableAI = true;
  }

  // Adjust based on model type
  if (CONTENT_MODELS.has(modelName)) {
    enableAI = true;
    enableAutoSave = true;
    
    // Specific model adjustments
    if (modelName === 'BlogPost') {
      enablePreview = true;
      if (lowerFieldName === 'content') {
        minHeight = 600;
        maxHeight = 1200;
      }
    } else if (modelName === 'Documentation') {
      enablePreview = true;
      minHeight = Math.max(minHeight, 400);
      maxHeight = Math.max(maxHeight, 800);
    } else if (modelName === 'Product') {
      enablePreview = false;
      enableAutoSave = false;
      minHeight = 150;
      maxHeight = 300;
    }
  }

  return {
    fieldName,
    isLongText: minHeight >= 300,
    isMarkdown,
    minHeight,
    maxHeight,
    enableAI,
    enablePreview,
    enableAutoSave
  };
}

/**
 * Get all content fields for a model
 */
export function getModelContentFields(
  modelName: string,
  fields: Array<{ name: string; type: string }>
): ContentFieldConfig[] {
  const contentFields: ContentFieldConfig[] = [];

  for (const field of fields) {
    const config = getContentFieldConfig(field.name, field.type, modelName);
    if (config) {
      contentFields.push(config);
    }
  }

  return contentFields;
}

/**
 * Check if a model should use enhanced content editing
 */
export function shouldUseEnhancedContentEditor(
  modelName: string,
  fields: Array<{ name: string; type: string }>
): boolean {
  return getModelContentFields(modelName, fields).length > 0;
}

/**
 * Generate enhanced content editor configuration for a model
 */
export function generateContentEditorConfig(
  modelName: string,
  fields: Array<{ name: string; type: string }>
): {
  modelName: string;
  contentFields: string[];
  enableAI: boolean;
  enablePreview: boolean;
  enableAutoSave: boolean;
  minHeight: number;
  maxHeight: number;
} | null {
  const contentFields = getModelContentFields(modelName, fields);
  
  if (contentFields.length === 0) {
    return null;
  }

  // Aggregate settings from all content fields
  const enableAI = contentFields.some(f => f.enableAI);
  const enablePreview = contentFields.some(f => f.enablePreview);
  const enableAutoSave = contentFields.some(f => f.enableAutoSave);
  const minHeight = Math.max(...contentFields.map(f => f.minHeight));
  const maxHeight = Math.max(...contentFields.map(f => f.maxHeight));

  return {
    modelName,
    contentFields: contentFields.map(f => f.fieldName),
    enableAI,
    enablePreview,
    enableAutoSave,
    minHeight,
    maxHeight
  };
}
