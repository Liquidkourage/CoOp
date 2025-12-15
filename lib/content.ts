import fs from 'fs';
import path from 'path';

export interface ContentMetadata {
  title?: string;
  creator?: string;
  date?: string;
  topics?: string[];
  format?: string;
  questionCount?: number;
  difficulty?: string;
  types?: string[];
  question?: string;
  description?: string; // Deprecated: use 'question' instead. Kept for backward compatibility.
  answer?: string;
  correctAnswer?: string;
  language?: string;
  license?: string;
  source?: string;
  tags?: string[];
  files?: string[];
  relatedContent?: string[];
  version?: string;
  lastUpdated?: string;
}

export interface ContentItem {
  id: string;
  path: string;
  metadata: ContentMetadata;
  files: string[];
}

const CONTENT_DIRS = ['creators', 'topics', 'archive', 'formats'];

function findMetadataFiles(dir: string, basePath: string = ''): Array<{ path: string; fullPath: string }> {
  const results: Array<{ path: string; fullPath: string }> = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...findMetadataFiles(fullPath, relativePath));
        }
      } else if (entry.name === 'metadata.json') {
        results.push({ path: relativePath, fullPath });
      }
    }
  } catch (error) {
    // Directory might not exist, skip it
  }
  
  return results;
}

export function loadAllContent(): ContentItem[] {
  const contentItems: ContentItem[] = [];
  const repoRoot = process.cwd();
  
  for (const dir of CONTENT_DIRS) {
    const dirPath = path.join(repoRoot, dir);
    if (fs.existsSync(dirPath)) {
      const metadataFiles = findMetadataFiles(dirPath, dir);
      
      for (const { path: relativePath, fullPath } of metadataFiles) {
        try {
          const metadataContent = fs.readFileSync(fullPath, 'utf-8');
          const metadata: ContentMetadata = JSON.parse(metadataContent);
          
          const dirPath = path.dirname(fullPath);
          const files = fs.readdirSync(dirPath)
            .filter(file => file !== 'metadata.json' && file !== 'README.md')
            .map(file => path.join(path.dirname(relativePath), file));
          
          const id = relativePath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
          
          contentItems.push({
            id,
            path: path.dirname(relativePath),
            metadata,
            files: files.length > 0 ? files : (metadata.files || [])
          });
        } catch (error) {
          console.error(`Error loading metadata from ${fullPath}:`, error);
        }
      }
    }
  }
  
  return contentItems;
}

export function searchContent(query: string, content: ContentItem[]): ContentItem[] {
  const lowerQuery = query.toLowerCase();
  
  return content.filter(item => {
    const { metadata } = item;
    
    if (metadata.title?.toLowerCase().includes(lowerQuery)) return true;
    if (metadata.question?.toLowerCase().includes(lowerQuery)) return true;
    if (metadata.description?.toLowerCase().includes(lowerQuery)) return true; // Backward compatibility
    if (metadata.creator?.toLowerCase().includes(lowerQuery)) return true;
    if (metadata.topics?.some(topic => topic.toLowerCase().includes(lowerQuery))) return true;
    if (metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;
    
    return false;
  });
}

export function filterContent(
  content: ContentItem[],
  filters: {
    topics?: string[];
    creator?: string;
    difficulty?: string;
    types?: string[];
    format?: string;
  }
): ContentItem[] {
  return content.filter(item => {
    const { metadata } = item;
    
    if (filters.topics && filters.topics.length > 0) {
      const itemTopics = metadata.topics || [];
      if (!filters.topics.some(topic => itemTopics.includes(topic))) {
        return false;
      }
    }
    
    if (filters.creator && metadata.creator?.toLowerCase() !== filters.creator.toLowerCase()) {
      return false;
    }
    
    if (filters.difficulty && metadata.difficulty !== filters.difficulty) {
      return false;
    }
    
    if (filters.types && filters.types.length > 0) {
      const itemTypes = metadata.types || [];
      if (!filters.types.some(type => itemTypes.includes(type))) {
        return false;
      }
    }
    
    if (filters.format && metadata.format !== filters.format) {
      return false;
    }
    
    return true;
  });
}

export function getAllTopics(content: ContentItem[]): string[] {
  const topicsSet = new Set<string>();
  
  content.forEach(item => {
    item.metadata.topics?.forEach(topic => topicsSet.add(topic));
  });
  
  return Array.from(topicsSet).sort();
}

export function getAllCreators(content: ContentItem[]): string[] {
  const creatorsSet = new Set<string>();
  
  content.forEach(item => {
    if (item.metadata.creator) {
      creatorsSet.add(item.metadata.creator);
    }
  });
  
  return Array.from(creatorsSet).sort();
}

