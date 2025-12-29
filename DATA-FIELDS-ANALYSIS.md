# Trivia Content Repository - Data Fields Analysis

## Current Data Fields

### Core Question Fields
- **`question`** (string, required) - The actual trivia question text
  - *Previously called `description` (deprecated but still supported)*
  - Used for: Display, search, export
  - Example: "How many players are in your team tonight?"

- **`answer`** (string, optional) - The correct answer to the question
  - *Also accepts `correctAnswer` as alias*
  - Used for: Display, export, validation
  - Example: "Abu Dhabi" or "A. Abu Dhabi"

- **`title`** (string, optional) - A short title/identifier for the question
  - Auto-generated from question text if not provided (first 100 chars)
  - Used for: Display, search, organization
  - Example: "Formula One Final Race"

### Metadata Fields

- **`creator`** (string, required) - Who created/wrote this question
  - Used for: Filtering, organization, attribution
  - Example: "Caleb Greyman", "Jay"

- **`date`** (string/Date, optional) - When the question was created/published
  - Format: ISO date string or YYYY-MM-DD
  - Used for: Chronological organization, filtering
  - Example: "2025-12-15"

- **`topics`** (string[], optional) - Categories/subjects this question belongs to
  - Used for: Filtering, organization, browsing
  - Example: ["Sports", "Geography", "Formula One"]

- **`types`** (string[], optional) - Question type/format
  - Used for: Filtering, grouping similar question styles
  - Example: ["Multiple Choice", "One of Many", "True/False"]

- **`difficulty`** (string, optional) - Difficulty level
  - Used for: Filtering, difficulty-based organization
  - Example: "Easy", "Medium", "Hard", "Expert"

- **`questionCount`** (number, optional) - Number of questions in a set/round
  - Used for: Grouping, statistics
  - Example: 10 (for a round of 10 questions)

- **`language`** (string, optional) - Language of the question
  - Default: "en"
  - Used for: Filtering, internationalization
  - Example: "en", "es", "fr"

- **`tags`** (string[], optional) - Additional keywords/tags
  - Used for: Search, flexible categorization
  - Example: ["2025", "championship", "racing"]

### Attribution & Source Fields

- **`source`** (string, optional) - Original source of the question
  - Used for: Attribution, tracking origin
  - Example: "TrivNow Database", "Wikipedia", "Original"

- **`license`** (string, optional) - License information
  - Default: CC-BY-4.0 (per README)
  - Used for: Legal compliance, usage rights
  - Example: "CC-BY-4.0"

### File & Media Fields

- **`files`** (string[], optional) - List of associated file names
  - Used for: Linking to images, audio, documents
  - Example: ["question-image.jpg", "audio-clip.mp3"]

- **`filePaths`** (string[], optional) - Full paths to files
  - Used for: File serving, organization
  - Example: ["uploads/caleb-greyman/question-image.jpg"]

### Relationship Fields

- **`relatedContent`** (string[], optional) - IDs or references to related questions
  - Used for: Linking related questions, building question sets
  - Example: ["question-123", "question-456"]

### Versioning Fields

- **`version`** (string, optional) - Version number
  - Used for: Tracking revisions
  - Example: "1.0", "2.1"

- **`lastUpdated`** (string/Date, optional) - Last modification timestamp
  - Used for: Change tracking, freshness
  - Example: "2025-12-16T10:30:00Z"

### Database-Only Fields (not in metadata)

- **`id`** (number) - Database primary key
- **`created_at`** (timestamp) - When record was created in database
- **`updated_at`** (timestamp) - When record was last updated in database

---

## Questions & Analysis

### 1. Field Redundancy
- **`answer` vs `correctAnswer`**: Currently both accepted, but `answer` is preferred. Should we standardize?
- **`question` vs `description`**: `description` is deprecated but still supported. Migration complete?
- **`date` vs `created_at`**: `date` is user-provided, `created_at` is system-generated. Both needed?

### 2. Missing Fields (Potential Additions)

**Question Structure:**
- **`options`** (string[]) - For multiple-choice questions, list all options
  - Currently handled by appending to question text, but could be structured
  - Example: ["Las Vegas", "Monaco", "Abu Dhabi"]

- **`explanation`** (string) - Explanation of why the answer is correct
  - Useful for learning/teaching contexts
  - Example: "Abu Dhabi hosts the final race of the F1 season..."

- **`hint`** (string) - Optional hint for the question
  - Useful for interactive trivia formats

**Organization:**
- **`round`** (string/number) - Round number in a set
  - Example: "Round 1", "3"

- **`set`** (string) - Name/ID of the question set
  - Example: "December 2025 Trivia Night"

- **`points`** (number) - Point value for this question
  - Example: 10, 20, 50

- **`timer`** (number) - Time limit in seconds
  - Example: 30, 60

**Media:**
- **`imageUrl`** (string) - Direct URL to image
- **`audioUrl`** (string) - Direct URL to audio
- **`videoUrl`** (string) - Direct URL to video

**Workflow:**
- **`status`** (string) - Draft, Published, Archived
- **`reviewedBy`** (string) - Who reviewed/approved this question
- **`reviewedAt`** (date) - When it was reviewed

### 3. Field Usage Patterns

**Required Fields:**
- `question` (required)
- `creator` (required)

**Commonly Used:**
- `answer`, `topics`, `types`, `date`

**Rarely Used:**
- `relatedContent`, `version`, `lastUpdated`, `license`

### 4. Import/Export Considerations

**Current Import Formats:**
- CSV (TrivNow format)
- Excel (.xlsx)
- Manual form submission

**Current Export Formats:**
- Q&A Pairs
- Quiz Format
- Spreadsheet (TSV)
- Plain Text
- Flashcards
- Bulk Copy
- Document Format
- Structured (JSON/CSV)

**Questions:**
- Should users be able to define custom export formats?
- Should import formats be extensible via plugins/configs?
- Do we need round-trip import/export (import → modify → export in same format)?

---

## Recommendations

### Immediate Actions
1. **Standardize field names**: Remove `description` and `correctAnswer` aliases after migration period
2. **Document field purposes**: Add field descriptions to UI tooltips/help text
3. **Validate field usage**: Ensure all fields are being used appropriately

### Future Enhancements
1. **Structured options**: Add `options` array field for multiple-choice questions
2. **Custom fields**: Allow users to add custom metadata fields
3. **Export templates**: Let users save/load export format configurations
4. **Import plugins**: Create a plugin system for new import formats

---

## Questions for Discussion

1. **Which fields are actually essential vs nice-to-have?**
2. **Should we support custom/user-defined fields?**
3. **Do we need structured `options` array, or is appending to question text sufficient?**
4. **What export formats are most important for CoOp members?**
5. **Should import/export be round-trip compatible (import → export → import)?**
6. **Do we need versioning/change tracking beyond `lastUpdated`?**
7. **Should questions be grouped into "sets" or "rounds" explicitly?**
8. **What media types do we need to support beyond files array?**


