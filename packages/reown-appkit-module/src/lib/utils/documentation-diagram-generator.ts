/**
 * Entity Extraction and Mermaid Diagram Generator
 * Extracts entities from documentation content and generates relationship diagrams
 */

// Common entity patterns to detect
const ENTITY_PATTERNS = {
  model: /model\s+(\w+)/gi,
  interface: /interface\s+(\w+)/gi,
  class: /class\s+(\w+)/gi,
  type: /type\s+(\w+)/gi,
  table: /table\s+(\w+)/gi,
  api: /api\s+(\w+)|endpoint[:\s]+(\w+)/gi,
  component: /component[:\s]+(\w+)|<(\w+)/gi,
  service: /service[:\s]+(\w+)/gi,
  hook: /hook[:\s]+(\w+)|use(\w+)/gi,
  store: /store[:\s]+(\w+)/gi,
} as const;

// Relationship patterns - more comprehensive
const RELATIONSHIP_PATTERNS = [
  { pattern: /(\w+)\s+has\s+(\w+)/gi, type: 'has', direction: 'one-to-many' },
  { pattern: /(\w+)\s+belongs?\s+to\s+(\w+)/gi, type: 'belongs to', direction: 'many-to-one' },
  { pattern: /(\w+)\s+references?\s+(\w+)/gi, type: 'references', direction: 'many-to-one' },
  { pattern: /(\w+)\s+uses?\s+(\w+)/gi, type: 'uses', direction: 'many-to-one' },
  { pattern: /(\w+)\s+contains?\s+(\w+)/gi, type: 'contains', direction: 'one-to-many' },
  { pattern: /(\w+)\s+includes?\s+(\w+)/gi, type: 'includes', direction: 'one-to-many' },
  { pattern: /(\w+)\s+depends?\s+on\s+(\w+)/gi, type: 'depends on', direction: 'many-to-one' },
  { pattern: /(\w+)\s+relates?\s+to\s+(\w+)/gi, type: 'relates to', direction: 'many-to-many' },
  { pattern: /(\w+)\s+connects?\s+to\s+(\w+)/gi, type: 'connects to', direction: 'many-to-many' },
  { pattern: /(\w+)\s+extends?\s+(\w+)/gi, type: 'extends', direction: 'one-to-one' },
  { pattern: /(\w+)\s+implements?\s+(\w+)/gi, type: 'implements', direction: 'many-to-one' },
  { pattern: /(\w+)\s+imports?\s+(\w+)/gi, type: 'imports', direction: 'many-to-one' },
  { pattern: /(\w+)\s+exports?\s+(\w+)/gi, type: 'exports', direction: 'one-to-many' },
  { pattern: /(\w+)\s+calls?\s+(\w+)/gi, type: 'calls', direction: 'many-to-one' },
  { pattern: /(\w+)\s+invokes?\s+(\w+)/gi, type: 'invokes', direction: 'many-to-one' },
  { pattern: /(\w+)\s+creates?\s+(\w+)/gi, type: 'creates', direction: 'one-to-many' },
  { pattern: /(\w+)\s+manages?\s+(\w+)/gi, type: 'manages', direction: 'one-to-many' },
  { pattern: /(\w+)\s+owns?\s+(\w+)/gi, type: 'owns', direction: 'one-to-many' },
  { pattern: /(\w+)\s+controls?\s+(\w+)/gi, type: 'controls', direction: 'one-to-many' },
];

// Extract capitalized words that might be entities
function extractCapitalizedEntities(text: string): Set<string> {
  const entities = new Set<string>();
  // Match capitalized words (at least 2 chars, starting with capital letter)
  const capitalizedPattern = /\b[A-Z][a-zA-Z]{2,}\b/g;
  const matches = text.matchAll(capitalizedPattern);
  
  for (const match of matches) {
    const word = match[0];
    // Filter out common words
    const commonWords = ['The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Which', 'Who', 'How', 'Why', 'With', 'From', 'Into', 'Over', 'Under', 'Between', 'Among', 'During', 'Before', 'After', 'Since', 'Until', 'While', 'Because', 'Although', 'However', 'Therefore', 'Moreover', 'Furthermore', 'Additionally', 'Finally', 'First', 'Second', 'Third', 'Last', 'Next', 'Previous', 'Current', 'Future', 'Past', 'Present'];
    if (!commonWords.includes(word)) {
      entities.add(word);
    }
  }
  
  return entities;
}

/**
 * Extract entities from markdown content
 */
export function extractEntities(content: string): {
  entities: Map<string, Set<string>>;
  relationships: Array<{ from: string; to: string; type: string; direction: string }>;
  entityAttributes: Map<string, string[]>;
} {
  const entities = new Map<string, Set<string>>();
  const relationships: Array<{ from: string; to: string; type: string; direction: string }> = [];
  const entityAttributes = new Map<string, string[]>();
  const allEntityNames = new Set<string>();

  // Extract entities by pattern
  for (const [type, pattern] of Object.entries(ENTITY_PATTERNS)) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const entityName = match[1] || match[2] || match[3];
      if (entityName && entityName.length > 1) {
        const normalizedName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
        if (!entities.has(type)) {
          entities.set(type, new Set());
        }
        entities.get(type)!.add(normalizedName);
        allEntityNames.add(normalizedName);
      }
    }
  }

  // Extract capitalized entities (concepts, proper nouns)
  const capitalizedEntities = extractCapitalizedEntities(content);
  for (const entity of capitalizedEntities) {
    if (!allEntityNames.has(entity)) {
      if (!entities.has('concept')) {
        entities.set('concept', new Set());
      }
      entities.get('concept')!.add(entity);
      allEntityNames.add(entity);
    }
  }

  // Extract relationships using improved patterns
  for (const relPattern of RELATIONSHIP_PATTERNS) {
    const matches = content.matchAll(relPattern.pattern);
    for (const match of matches) {
      const from = match[1]?.charAt(0).toUpperCase() + match[1]?.slice(1);
      const to = match[2]?.charAt(0).toUpperCase() + match[2]?.slice(1);
      
      if (from && to && from.length > 2 && to.length > 2) {
        // Only add if both entities exist or are likely entities
        if (allEntityNames.has(from) || allEntityNames.has(to) || 
            (from.length > 3 && to.length > 3)) {
          relationships.push({
            from,
            to,
            type: relPattern.type,
            direction: relPattern.direction
          });
          
          // Ensure both entities are in the set
          if (!allEntityNames.has(from)) {
            if (!entities.has('concept')) {
              entities.set('concept', new Set());
            }
            entities.get('concept')!.add(from);
            allEntityNames.add(from);
          }
          if (!allEntityNames.has(to)) {
            if (!entities.has('concept')) {
              entities.set('concept', new Set());
            }
            entities.get('concept')!.add(to);
            allEntityNames.add(to);
          }
        }
      }
    }
  }

  // Extract entity attributes (fields, properties)
  for (const entityName of allEntityNames) {
    const attributes: string[] = [];
    // Look for patterns like "EntityName has field X" or "EntityName.field"
    const entityPattern = new RegExp(`\\b${entityName}\\s+has\\s+([a-zA-Z]+)`, 'gi');
    const matches = content.matchAll(entityPattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2) {
        attributes.push(match[1]);
      }
    }
    
    // Look for field patterns near entity mentions
    const fieldPattern = new RegExp(`\\b${entityName}[\\s\\S]{0,200}?\\b(id|name|title|description|type|status|created|updated|date|time|amount|price|value|count|total)\\b`, 'gi');
    const fieldMatches = content.matchAll(fieldPattern);
    for (const match of fieldMatches) {
      if (match[1] && !attributes.includes(match[1])) {
        attributes.push(match[1]);
      }
    }
    
    if (attributes.length > 0) {
      entityAttributes.set(entityName, attributes.slice(0, 5)); // Limit to 5 attributes
    }
  }

  // Create implicit relationships for entities mentioned together
  const sentences = content.split(/[.!?]\s+/);
  for (const sentence of sentences) {
    const mentionedEntities: string[] = [];
    for (const entity of allEntityNames) {
      if (sentence.includes(entity)) {
        mentionedEntities.push(entity);
      }
    }
    
    // If 2-3 entities are mentioned together, create a relationship
    if (mentionedEntities.length >= 2 && mentionedEntities.length <= 3) {
      for (let i = 0; i < mentionedEntities.length - 1; i++) {
        const from = mentionedEntities[i];
        const to = mentionedEntities[i + 1];
        
        // Check if relationship already exists
        const exists = relationships.some(r => 
          (r.from === from && r.to === to) || (r.from === to && r.to === from)
        );
        
        if (!exists) {
          relationships.push({
            from,
            to,
            type: 'related to',
            direction: 'many-to-many'
          });
        }
      }
    }
  }

  return { entities, relationships, entityAttributes };
}

/**
 * Generate Mermaid ER diagram from entities
 * Limits to top 8 entities for readability and proper scaling
 */
export function generateMermaidDiagram(
  entities: Map<string, Set<string>>,
  relationships: Array<{ from: string; to: string; type: string; direction: string }>,
  entityAttributes: Map<string, string[]> = new Map()
): string {
  if (entities.size === 0 && relationships.length === 0) {
    return '';
  }

  // Collect all unique entities
  const allEntities = new Set<string>();
  for (const entitySet of entities.values()) {
    for (const entity of entitySet) {
      allEntities.add(entity);
    }
  }

  if (allEntities.size === 0) {
    return '';
  }

  // Limit to top 8 entities - prioritize entities with relationships
  const entityArray = Array.from(allEntities);
  const entitiesWithRelationships = new Set<string>();
  relationships.forEach(rel => {
    entitiesWithRelationships.add(rel.from);
    entitiesWithRelationships.add(rel.to);
  });

  // Sort: entities with relationships first, then alphabetically
  const sortedEntities = entityArray.sort((a, b) => {
    const aHasRel = entitiesWithRelationships.has(a);
    const bHasRel = entitiesWithRelationships.has(b);
    if (aHasRel && !bHasRel) return -1;
    if (!aHasRel && bHasRel) return 1;
    return a.localeCompare(b);
  });

  // Take top 8 entities
  const topEntities = sortedEntities.slice(0, 8);
  const selectedEntities = new Set(topEntities);

  // Filter relationships to only include selected entities
  const filteredRelationships = relationships.filter(rel => 
    selectedEntities.has(rel.from) && selectedEntities.has(rel.to)
  );

  let mermaid = 'erDiagram\n\n';

  // Add entities with their attributes
  for (const entity of topEntities) {
    mermaid += `    ${entity} {\n`;
    
    // Add attributes if available
    const attributes = entityAttributes.get(entity);
    if (attributes && attributes.length > 0) {
      for (const attr of attributes.slice(0, 4)) {
        mermaid += `        string ${attr}\n`;
      }
    } else {
      // Default attributes
      mermaid += `        string id\n`;
      mermaid += `        string name\n`;
    }
    
    mermaid += `    }\n\n`;
  }

  // Add relationships with proper cardinality (only for selected entities)
  const addedRelationships = new Set<string>();
  for (const rel of filteredRelationships) {
    // Skip if relationship already added (avoid duplicates)
    const relKey = `${rel.from}-${rel.to}-${rel.type}`;
    if (addedRelationships.has(relKey)) continue;
    addedRelationships.add(relKey);

    // Determine relationship cardinality based on direction
    let relType = '||--||'; // Default: one-to-one
    
    if (rel.direction === 'one-to-many') {
      relType = '||--o{';
    } else if (rel.direction === 'many-to-one') {
      relType = '}o--||';
    } else if (rel.direction === 'many-to-many') {
      relType = '}o--o{';
    } else if (rel.type.includes('has') || rel.type.includes('contains') || rel.type.includes('owns') || rel.type.includes('manages')) {
      relType = '||--o{';
    } else if (rel.type.includes('belongs to') || rel.type.includes('references') || rel.type.includes('depends on')) {
      relType = '}o--||';
    }

    // Ensure both entities exist in selected set
    if (selectedEntities.has(rel.from) && selectedEntities.has(rel.to)) {
      mermaid += `    ${rel.from} ${relType} ${rel.to} : "${rel.type}"\n`;
    }
  }

  // If no explicit relationships but multiple entities, create default relationships
  if (filteredRelationships.length === 0 && topEntities.length > 1) {
    for (let i = 0; i < topEntities.length - 1; i++) {
      mermaid += `    ${topEntities[i]} ||--o{ ${topEntities[i + 1]} : "related to"\n`;
    }
  }

  return mermaid;
}

/**
 * Generate Mermaid flowchart from entities and relationships
 */
export function generateMermaidFlowchart(
  entities: Map<string, Set<string>>,
  relationships: Array<{ from: string; to: string; type: string; direction: string }>
): string {
  if (entities.size === 0 && relationships.length === 0) {
    return '';
  }

  // Collect all entities
  const allEntities = new Set<string>();
  for (const entitySet of entities.values()) {
    for (const entity of entitySet) {
      allEntities.add(entity);
    }
  }

  if (allEntities.size === 0) {
    return '';
  }

  let mermaid = 'flowchart TD\n';
  let nodeCounter = 0;
  const nodeMap = new Map<string, string>();

  // Create nodes with better shapes
  for (const entity of Array.from(allEntities).sort()) {
    const nodeId = `N${nodeCounter++}`;
    nodeMap.set(entity, nodeId);
    
    // Use cylinder shape for entities (more readable)
    mermaid += `    ${nodeId}[${entity}]\n`;
  }

  // Create edges with proper styling
  const addedEdges = new Set<string>();
  for (const rel of relationships) {
    const fromNode = nodeMap.get(rel.from);
    const toNode = nodeMap.get(rel.to);
    
    if (fromNode && toNode) {
      const edgeKey = `${fromNode}-${toNode}`;
      if (!addedEdges.has(edgeKey)) {
        addedEdges.add(edgeKey);
        mermaid += `    ${fromNode} -->|"${rel.type}"| ${toNode}\n`;
      }
    }
  }

  // If no relationships but multiple entities, create connections
  if (relationships.length === 0 && allEntities.size > 1) {
    const entityArray = Array.from(allEntities).sort();
    for (let i = 0; i < entityArray.length - 1; i++) {
      const fromNode = nodeMap.get(entityArray[i]);
      const toNode = nodeMap.get(entityArray[i + 1]);
      if (fromNode && toNode) {
        mermaid += `    ${fromNode} -->|"related to"| ${toNode}\n`;
      }
    }
  }

  // Add styling with dark theme support
  mermaid += `    classDef entityClass fill:#F97316,stroke:#EA580C,stroke-width:2px,color:#fff\n`;
  mermaid += `    classDef relationClass fill:#FB923C,stroke:#F97316,stroke-width:2px,color:#fff\n`;
  
  // Apply styles to all nodes
  for (const nodeId of nodeMap.values()) {
    mermaid += `    class ${nodeId} entityClass\n`;
  }

  return mermaid;
}

/**
 * Generate comprehensive Mermaid diagram from documentation content
 */
export function generateDocumentationDiagram(content: string): string {
  const { entities, relationships, entityAttributes } = extractEntities(content);
  
  // Collect all entities
  const allEntities = new Set<string>();
  for (const entitySet of entities.values()) {
    for (const entity of entitySet) {
      allEntities.add(entity);
    }
  }

  // If we have entities, always use ER diagram (more readable for relationships)
  if (allEntities.size > 0) {
    return generateMermaidDiagram(entities, relationships, entityAttributes);
  }
  
  // Fallback to flowchart if no entities found
  return generateMermaidFlowchart(entities, relationships);
}

