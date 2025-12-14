import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_items (
        id SERIAL PRIMARY KEY,
        title TEXT,
        creator TEXT,
        date DATE,
        topics TEXT[],
        format TEXT,
        question_count INTEGER,
        difficulty TEXT,
        types TEXT[],
        description TEXT,
        answer TEXT,
        language TEXT DEFAULT 'en',
        license TEXT,
        source TEXT,
        tags TEXT[],
        files TEXT[],
        file_paths TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add answer column if it doesn't exist (for existing databases)
    await client.query(`
      ALTER TABLE content_items 
      ADD COLUMN IF NOT EXISTS answer TEXT
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_content_creator ON content_items(creator);
      CREATE INDEX IF NOT EXISTS idx_content_topics ON content_items USING GIN(topics);
      CREATE INDEX IF NOT EXISTS idx_content_date ON content_items(date);
      CREATE INDEX IF NOT EXISTS idx_content_difficulty ON content_items(difficulty);
      CREATE INDEX IF NOT EXISTS idx_content_format ON content_items(format);
    `);
  } finally {
    client.release();
  }
}

export interface ContentRow {
  id: number;
  title: string | null;
  creator: string | null;
  date: string | null;
  topics: string[] | null;
  format: string | null;
  question_count: number | null;
  difficulty: string | null;
  types: string[] | null;
  description: string | null;
  answer: string | null;
  language: string | null;
  license: string | null;
  source: string | null;
  tags: string[] | null;
  files: string[] | null;
  file_paths: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export async function insertContent(metadata: {
  title?: string;
  creator?: string;
  date?: string;
  topics?: string[];
  format?: string;
  questionCount?: number;
  difficulty?: string;
  types?: string[];
  description?: string;
  answer?: string;
  language?: string;
  license?: string;
  source?: string;
  tags?: string[];
  files?: string[];
  filePaths?: string[];
}) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO content_items (
        title, creator, date, topics, format, question_count, difficulty,
        types, description, answer, language, license, source, tags, files, file_paths
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      metadata.title || null,
      metadata.creator || null,
      metadata.date || null,
      metadata.topics || [],
      metadata.format || null,
      metadata.questionCount || null,
      metadata.difficulty || null,
      metadata.types || [],
      metadata.description || null,
      metadata.answer || null,
      metadata.language || 'en',
      metadata.license || null,
      metadata.source || null,
      metadata.tags || [],
      metadata.files || [],
      metadata.filePaths || []
    ]);
    return result.rows[0] as ContentRow;
  } finally {
    client.release();
  }
}

export async function getAllContent() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM content_items ORDER BY created_at DESC');
    return result.rows as ContentRow[];
  } finally {
    client.release();
  }
}

export async function searchContent(query: string) {
  const client = await pool.connect();
  try {
    const searchTerm = `%${query.toLowerCase()}%`;
    const result = await client.query(`
      SELECT * FROM content_items
      WHERE 
        LOWER(title) LIKE $1 OR
        LOWER(creator) LIKE $1 OR
        LOWER(description) LIKE $1 OR
        EXISTS (SELECT 1 FROM unnest(topics) AS topic WHERE LOWER(topic) LIKE $1) OR
        EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE LOWER(tag) LIKE $1)
      ORDER BY created_at DESC
    `, [searchTerm]);
    return result.rows as ContentRow[];
  } finally {
    client.release();
  }
}

export async function filterContent(filters: {
  topics?: string[];
  creator?: string;
  difficulty?: string;
  format?: string;
}) {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM content_items WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.topics && filters.topics.length > 0) {
      query += ` AND topics && $${paramCount}`;
      params.push(filters.topics);
      paramCount++;
    }

    if (filters.creator) {
      query += ` AND creator = $${paramCount}`;
      params.push(filters.creator);
      paramCount++;
    }

    if (filters.difficulty) {
      query += ` AND difficulty = $${paramCount}`;
      params.push(filters.difficulty);
      paramCount++;
    }

    if (filters.format) {
      query += ` AND format = $${paramCount}`;
      params.push(filters.format);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await client.query(query, params);
    return result.rows as ContentRow[];
  } finally {
    client.release();
  }
}

export async function getAllTopics() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT DISTINCT unnest(topics) AS topic
      FROM content_items
      WHERE topics IS NOT NULL AND array_length(topics, 1) > 0
      ORDER BY topic
    `);
    return result.rows.map(row => row.topic) as string[];
  } finally {
    client.release();
  }
}

export async function getAllCreators() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT DISTINCT creator
      FROM content_items
      WHERE creator IS NOT NULL
      ORDER BY creator
    `);
    return result.rows.map(row => row.creator) as string[];
  } finally {
    client.release();
  }
}

export { pool };

