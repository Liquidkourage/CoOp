import { NextResponse } from 'next/server';
import { initDatabase, pool } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    const client = await pool.connect();
    
    try {
      // Get total counts
      const questionsResult = await client.query('SELECT COUNT(*) as count FROM content_items');
      const roundsResult = await client.query('SELECT COUNT(*) as count FROM rounds');
      const setsResult = await client.query('SELECT COUNT(*) as count FROM sets');
      
      // Get questions by topic
      const topicsResult = await client.query(`
        SELECT unnest(topics) as topic, COUNT(*) as count
        FROM content_items
        WHERE topics IS NOT NULL AND array_length(topics, 1) > 0
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 10
      `);
      
      // Get questions by creator
      const creatorsResult = await client.query(`
        SELECT creator, COUNT(*) as count
        FROM content_items
        WHERE creator IS NOT NULL
        GROUP BY creator
        ORDER BY count DESC
        LIMIT 10
      `);
      
      // Get questions by difficulty
      const difficultyResult = await client.query(`
        SELECT difficulty, COUNT(*) as count
        FROM content_items
        WHERE difficulty IS NOT NULL
        GROUP BY difficulty
        ORDER BY count DESC
      `);
      
      // Get recent activity (last 30 days)
      const recentQuestions = await client.query(`
        SELECT COUNT(*) as count
        FROM content_items
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);
      
      const recentRounds = await client.query(`
        SELECT COUNT(*) as count
        FROM rounds
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);
      
      const recentSets = await client.query(`
        SELECT COUNT(*) as count
        FROM sets
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);
      
      // Get average questions per round
      const avgQuestionsPerRound = await client.query(`
        SELECT COALESCE(AVG(question_count), 0) as avg
        FROM (
          SELECT round_id, COUNT(*) as question_count
          FROM question_rounds
          GROUP BY round_id
        ) subquery
      `);
      
      // Get average questions per set
      const avgQuestionsPerSet = await client.query(`
        SELECT COALESCE(AVG(question_count), 0) as avg
        FROM (
          SELECT set_id, COUNT(*) as question_count
          FROM question_sets
          GROUP BY set_id
        ) subquery
      `);
      
      return NextResponse.json({
        success: true,
        stats: {
          totals: {
            questions: parseInt(questionsResult.rows[0].count, 10),
            rounds: parseInt(roundsResult.rows[0].count, 10),
            sets: parseInt(setsResult.rows[0].count, 10),
          },
          topics: topicsResult.rows.map(row => ({
            topic: row.topic,
            count: parseInt(row.count, 10)
          })),
          creators: creatorsResult.rows.map(row => ({
            creator: row.creator,
            count: parseInt(row.count, 10)
          })),
          difficulty: difficultyResult.rows.map(row => ({
            difficulty: row.difficulty,
            count: parseInt(row.count, 10)
          })),
          recent: {
            questions: parseInt(recentQuestions.rows[0].count, 10),
            rounds: parseInt(recentRounds.rows[0].count, 10),
            sets: parseInt(recentSets.rows[0].count, 10),
          },
          averages: {
            questionsPerRound: parseFloat(avgQuestionsPerRound.rows[0].avg) || 0,
            questionsPerSet: parseFloat(avgQuestionsPerSet.rows[0].avg) || 0,
          }
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error loading statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load statistics' },
      { status: 500 }
    );
  }
}

