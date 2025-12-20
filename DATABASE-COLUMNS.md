# Database Columns - Comprehensive List

## Table: `content_items`

This document lists all columns available for each question/content item in the database.

---

## Primary Key & System Fields

| Column Name | Type | Required | Description | Notes |
|------------|------|----------|-------------|-------|
| `id` | SERIAL (INTEGER) | ✅ Yes | Primary key, auto-incrementing | System-generated, unique identifier |
| `created_at` | TIMESTAMP | ✅ Yes | When record was created | Auto-set to CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | ✅ Yes | When record was last updated | Auto-set to CURRENT_TIMESTAMP |

---

## Core Content Fields

| Column Name | Type | Required | Description | Notes |
|------------|------|----------|-------------|-------|
| `title` | TEXT | ❌ No | Short title/identifier for the question | Auto-generated from question text if not provided (first 100 chars) |
| `description` | TEXT | ❌ No | **The actual trivia question text** | ⚠️ **Deprecated name** - Use `question` field in code, but stored in `description` column for backward compatibility |
| `answer` | TEXT | ❌ No | The correct answer to the question | Can also accept `correctAnswer` as alias in API |
| `options` | TEXT[] | ❌ No | Array of answer options for multiple-choice questions | Example: `["Las Vegas", "Monaco", "Abu Dhabi"]` |

---

## Attribution & Organization Fields

| Column Name | Type | Required | Description | Notes |
|------------|------|----------|-------------|-------|
| `creator` | TEXT | ✅ Yes | Who created/wrote this content | Required for all content items |
| `date` | DATE | ❌ No | When the question was created/published | Format: YYYY-MM-DD or ISO date string |
| `topics` | TEXT[] | ❌ No | Categories/subjects this question belongs to | Array of strings, e.g., `["Sports", "Geography"]` |
| `types` | TEXT[] | ❌ No | Question type/format | Array of strings, e.g., `["Multiple Choice", "True/False"]` |
| `difficulty` | TEXT | ❌ No | Difficulty level | Examples: "Easy", "Medium", "Hard", "Expert" |
| `tags` | TEXT[] | ❌ No | Additional keywords/tags for flexible categorization | Array of strings for search and filtering |

---

## Metadata Fields

| Column Name | Type | Required | Description | Notes |
|------------|------|----------|-------------|-------|
| `question_count` | INTEGER | ❌ No | Number of questions in a set/round | Used for grouping questions |
| `language` | TEXT | ❌ No | Language of the question | Default: "en" |
| `license` | TEXT | ❌ No | License information | Default: CC-BY-4.0 (per README) |
| `source` | TEXT | ❌ No | Original source of the question | For attribution and tracking origin |

---

## File & Media Fields

| Column Name | Type | Required | Description | Notes |
|------------|------|----------|-------------|-------|
| `files` | TEXT[] | ❌ No | List of associated file names | Example: `["question-image.jpg", "audio-clip.mp3"]` |
| `file_paths` | TEXT[] | ❌ No | Full paths to files | Example: `["uploads/creator-name/question-image.jpg"]` |

---

## Field Mapping Notes

### Code Layer vs Database Layer

The code uses `question` field, but the database stores it in `description` column:

- **Code/API**: `metadata.question`
- **Database**: `description` column
- **Reason**: Backward compatibility with existing data

### Array Fields

The following fields are stored as PostgreSQL arrays (`TEXT[]`):
- `topics` - Categories/subjects
- `types` - Question types
- `tags` - Keywords/tags
- `options` - Answer options (multiple-choice)
- `files` - File names
- `file_paths` - File paths

### Indexes

The following indexes exist for performance:
- `idx_content_creator` - On `creator` column
- `idx_content_topics` - GIN index on `topics` array
- `idx_content_date` - On `date` column
- `idx_content_difficulty` - On `difficulty` column

---

## Complete Column List (Alphabetical)

1. `answer` - TEXT
2. `created_at` - TIMESTAMP
3. `creator` - TEXT ⭐ **Required**
4. `date` - DATE
5. `description` - TEXT (stores question text)
6. `difficulty` - TEXT
7. `file_paths` - TEXT[]
8. `files` - TEXT[]
9. `id` - SERIAL ⭐ **Primary Key**
10. `language` - TEXT (default: 'en')
11. `license` - TEXT
12. `options` - TEXT[]
13. `question_count` - INTEGER
14. `source` - TEXT
15. `tags` - TEXT[]
16. `title` - TEXT
17. `topics` - TEXT[]
18. `types` - TEXT[]
19. `updated_at` - TIMESTAMP

**Total: 19 columns**

---

## Required Fields Summary

- ✅ **Required**: `creator` (must be provided)
- ✅ **System-generated**: `id`, `created_at`, `updated_at`
- ❌ **Optional**: All other fields

**Note**: While `title` is optional, if not provided, it will be auto-generated from the question text (first 100 characters).

---

## Example Row Structure

```json
{
  "id": 1,
  "title": "Formula One Final Race",
  "creator": "Caleb Greyman",
  "date": "2025-12-15",
  "topics": ["Sports", "Formula One"],
  "question_count": null,
  "difficulty": null,
  "types": ["Multiple Choice"],
  "description": "Which city will host the final race of the 2025 Formula One World Championship this coming weekend?",
  "answer": "Abu Dhabi",
  "options": ["Las Vegas", "Monaco", "Abu Dhabi"],
  "language": "en",
  "license": null,
  "source": null,
  "tags": ["2025", "championship", "racing"],
  "files": [],
  "file_paths": [],
  "created_at": "2025-12-16T10:30:00Z",
  "updated_at": "2025-12-16T10:30:00Z"
}
```

---

## API Field Mapping

When content is returned via API, fields are mapped as follows:

| Database Column | API Field | Notes |
|----------------|-----------|-------|
| `description` | `question` | Primary field name in API |
| `description` | `description` | Also included for backward compatibility |
| `answer` | `answer` | Direct mapping |
| `answer` | `correctAnswer` | Alias for backward compatibility |
| `question_count` | `questionCount` | CamelCase conversion |
| `file_paths` | `files` (in ContentItem) | Mapped to files array in response |

---

## Migration History

1. **Initial Schema**: Created with basic fields
2. **Added `answer` column**: Via `ALTER TABLE` migration
3. **Added `options` column**: Via `ALTER TABLE` migration (for multiple-choice questions)

---

## Notes for Developers

- Always use `question` field in code, not `description`
- The database column is `description` for backward compatibility
- Array fields use PostgreSQL array syntax: `TEXT[]`
- All array fields default to empty array `[]` if not provided
- `language` defaults to `'en'` if not specified
- Timestamps are automatically managed by the database

