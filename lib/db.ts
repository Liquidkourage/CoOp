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
        question_count INTEGER,
        difficulty TEXT,
        types TEXT[],
        description TEXT,
        answer TEXT,
        options TEXT[],
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

    // Add options column if it doesn't exist (for existing databases)
    await client.query(`
      ALTER TABLE content_items 
      ADD COLUMN IF NOT EXISTS options TEXT[]
    `);

    // Add new fields: points, timer, round, set, explanation
    await client.query(`
      ALTER TABLE content_items 
      ADD COLUMN IF NOT EXISTS points INTEGER
    `);
    await client.query(`
      ALTER TABLE content_items 
      ADD COLUMN IF NOT EXISTS timer INTEGER
    `);
    await client.query(`
      ALTER TABLE content_items 
      ADD COLUMN IF NOT EXISTS round TEXT
    `);
    await client.query(`
      ALTER TABLE content_items 
      ADD COLUMN IF NOT EXISTS set TEXT
    `);
    await client.query(`
      ALTER TABLE content_items 
      ADD COLUMN IF NOT EXISTS explanation TEXT
    `);
    await client.query(`
      ALTER TABLE content_items 
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);
    await client.query(`
      ALTER TABLE content_items 
      ADD COLUMN IF NOT EXISTS alternate_answers TEXT[]
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_content_creator ON content_items(creator);
      CREATE INDEX IF NOT EXISTS idx_content_topics ON content_items USING GIN(topics);
      CREATE INDEX IF NOT EXISTS idx_content_date ON content_items(date);
      CREATE INDEX IF NOT EXISTS idx_content_difficulty ON content_items(difficulty);
      CREATE INDEX IF NOT EXISTS idx_content_round ON content_items(round);
      CREATE INDEX IF NOT EXISTS idx_content_set ON content_items(set);
    `);

    // Create rounds table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rounds (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        creator TEXT,
        date DATE,
        description TEXT,
        topics TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sets (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        creator TEXT,
        date DATE,
        description TEXT,
        topics TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create junction tables for many-to-many relationships
    await client.query(`
      CREATE TABLE IF NOT EXISTS question_rounds (
        question_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
        round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
        sequence INTEGER DEFAULT 0,
        PRIMARY KEY (question_id, round_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS question_sets (
        question_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
        set_id INTEGER REFERENCES sets(id) ON DELETE CASCADE,
        sequence INTEGER DEFAULT 0,
        PRIMARY KEY (question_id, set_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS round_sets (
        round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
        set_id INTEGER REFERENCES sets(id) ON DELETE CASCADE,
        sequence INTEGER DEFAULT 0,
        PRIMARY KEY (round_id, set_id)
      )
    `);

    // Create indexes for junction tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_question_rounds_question ON question_rounds(question_id);
      CREATE INDEX IF NOT EXISTS idx_question_rounds_round ON question_rounds(round_id);
      CREATE INDEX IF NOT EXISTS idx_question_sets_question ON question_sets(question_id);
      CREATE INDEX IF NOT EXISTS idx_question_sets_set ON question_sets(set_id);
      CREATE INDEX IF NOT EXISTS idx_round_sets_round ON round_sets(round_id);
      CREATE INDEX IF NOT EXISTS idx_round_sets_set ON round_sets(set_id);
      CREATE INDEX IF NOT EXISTS idx_rounds_creator ON rounds(creator);
      CREATE INDEX IF NOT EXISTS idx_sets_creator ON sets(creator);
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
  question_count: number | null;
  difficulty: string | null;
  types: string[] | null;
  description: string | null;
  answer: string | null;
  options: string[] | null;
  points: number | null;
  timer: number | null;
  round: string | null;
  set: string | null;
  explanation: string | null;
  notes: string | null;
  alternate_answers: string[] | null;
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
  // title removed - individual questions NEVER need titles
  creator?: string;
  date?: string;
  topics?: string[];
  questionCount?: number;
  difficulty?: string;
  types?: string[];
  question?: string;
  description?: string; // Deprecated: use 'question' instead. Kept for backward compatibility.
  answer?: string;
  options?: string[];
  points?: number;
  timer?: number;
  round?: string;
  set?: string;
  explanation?: string;
  notes?: string;
  alternateAnswers?: string[];
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
        title, creator, date, topics, question_count, difficulty,
        types, description, answer, options, points, timer, round, set, explanation, notes, alternate_answers,
        language, license, source, tags, files, file_paths
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `, [
      null, // title - NEVER used for individual questions, kept for backward compatibility only
      metadata.creator || null,
      metadata.date || null,
      metadata.topics || [],
      metadata.questionCount || null,
      metadata.difficulty || null,
      metadata.types || [],
      metadata.question || metadata.description || null, // Map 'question' to 'description' column
      metadata.answer || null,
      metadata.options || [],
      metadata.points || null,
      metadata.timer || null,
      metadata.round || null,
      metadata.set || null,
      metadata.explanation || null,
      metadata.notes || null,
      metadata.alternateAnswers || [],
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
        LOWER(COALESCE(description, '')) LIKE $1 OR
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
      WHERE topics IS NOT NULL 
        AND array_length(topics, 1) > 0
      ORDER BY topic
    `);
    const topics = result.rows
      .map(row => row.topic)
      .filter((topic): topic is string => 
        topic !== null && topic !== undefined && typeof topic === 'string' && topic.trim() !== ''
      );
    return topics;
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

// Round and Set interfaces
export interface RoundRow {
  id: number;
  name: string;
  creator: string | null;
  date: string | null;
  description: string | null;
  topics: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface SetRow {
  id: number;
  name: string;
  creator: string | null;
  date: string | null;
  description: string | null;
  topics: string[] | null;
  created_at: Date;
  updated_at: Date;
}

// Round and Set CRUD operations
export async function insertRound(metadata: {
  name: string;
  creator?: string;
  date?: string;
  description?: string;
  topics?: string[];
}) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO rounds (name, creator, date, description, topics)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      metadata.name,
      metadata.creator || null,
      metadata.date || null,
      metadata.description || null,
      metadata.topics || []
    ]);
    return result.rows[0] as RoundRow;
  } finally {
    client.release();
  }
}

export async function insertSet(metadata: {
  name: string;
  creator?: string;
  date?: string;
  description?: string;
  topics?: string[];
}) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO sets (name, creator, date, description, topics)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      metadata.name,
      metadata.creator || null,
      metadata.date || null,
      metadata.description || null,
      metadata.topics || []
    ]);
    return result.rows[0] as SetRow;
  } finally {
    client.release();
  }
}

export async function getAllRounds() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM rounds ORDER BY created_at DESC');
    return result.rows as RoundRow[];
  } finally {
    client.release();
  }
}

export async function getAllSets() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM sets ORDER BY created_at DESC');
    return result.rows as SetRow[];
  } finally {
    client.release();
  }
}

export async function getRoundById(id: number) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM rounds WHERE id = $1', [id]);
    return result.rows[0] as RoundRow | undefined;
  } finally {
    client.release();
  }
}

export async function getSetById(id: number) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM sets WHERE id = $1', [id]);
    return result.rows[0] as SetRow | undefined;
  } finally {
    client.release();
  }
}

// Junction table operations
export async function addQuestionToRound(questionId: number, roundId: number, sequence: number = 0) {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO question_rounds (question_id, round_id, sequence)
      VALUES ($1, $2, $3)
      ON CONFLICT (question_id, round_id) DO UPDATE SET sequence = $3
    `, [questionId, roundId, sequence]);
  } finally {
    client.release();
  }
}

export async function addQuestionToSet(questionId: number, setId: number, sequence: number = 0) {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO question_sets (question_id, set_id, sequence)
      VALUES ($1, $2, $3)
      ON CONFLICT (question_id, set_id) DO UPDATE SET sequence = $3
    `, [questionId, setId, sequence]);
  } finally {
    client.release();
  }
}

export async function addRoundToSet(roundId: number, setId: number, sequence: number = 0) {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO round_sets (round_id, set_id, sequence)
      VALUES ($1, $2, $3)
      ON CONFLICT (round_id, set_id) DO UPDATE SET sequence = $3
    `, [roundId, setId, sequence]);
  } finally {
    client.release();
  }
}

export async function getQuestionsInRound(roundId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT ci.*, qr.sequence
      FROM content_items ci
      JOIN question_rounds qr ON ci.id = qr.question_id
      WHERE qr.round_id = $1
      ORDER BY qr.sequence, ci.created_at
    `, [roundId]);
    return result.rows as (ContentRow & { sequence: number })[];
  } finally {
    client.release();
  }
}

export async function getQuestionsInSet(setId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT ci.*, qs.sequence
      FROM content_items ci
      JOIN question_sets qs ON ci.id = qs.question_id
      WHERE qs.set_id = $1
      ORDER BY qs.sequence, ci.created_at
    `, [setId]);
    return result.rows as (ContentRow & { sequence: number })[];
  } finally {
    client.release();
  }
}

export async function getRoundsInSet(setId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT r.*, rs.sequence
      FROM rounds r
      JOIN round_sets rs ON r.id = rs.round_id
      WHERE rs.set_id = $1
      ORDER BY rs.sequence, r.created_at
    `, [setId]);
    return result.rows as (RoundRow & { sequence: number })[];
  } finally {
    client.release();
  }
}

export async function getRoundsForQuestion(questionId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT r.*, qr.sequence
      FROM rounds r
      JOIN question_rounds qr ON r.id = qr.round_id
      WHERE qr.question_id = $1
      ORDER BY qr.sequence, r.created_at
    `, [questionId]);
    return result.rows as (RoundRow & { sequence: number })[];
  } finally {
    client.release();
  }
}

export async function getSetsForQuestion(questionId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT s.*, qs.sequence
      FROM sets s
      JOIN question_sets qs ON s.id = qs.set_id
      WHERE qs.question_id = $1
      ORDER BY qs.sequence, s.created_at
    `, [questionId]);
    return result.rows as (SetRow & { sequence: number })[];
  } finally {
    client.release();
  }
}

export async function getSetsForRound(roundId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT s.*, rs.sequence
      FROM sets s
      JOIN round_sets rs ON s.id = rs.set_id
      WHERE rs.round_id = $1
      ORDER BY rs.sequence, s.created_at
    `, [roundId]);
    return result.rows as (SetRow & { sequence: number })[];
  } finally {
    client.release();
  }
}

export { pool };

