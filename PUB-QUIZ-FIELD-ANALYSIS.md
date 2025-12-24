# Pub Quiz Content Repository - Comprehensive Field Analysis

## Executive Summary

This document provides a deep analysis of all possible data fields for a pub quiz content repository, ranked from **mandatory** to **incredibly optional**. 

**⚠️ IMPORTANT: This repository is focused on INDIVIDUAL QUESTIONS, not quiz sets or events.** While questions may include metadata about rounds or sets (from imports), the core unit of content is the individual question. Questions are reusable building blocks that hosts can combine into their own quiz sets.

---

## Understanding Pub Quiz Context

### What Makes Pub Quiz Content Unique?

1. **Live Performance**: Questions are read aloud, not just displayed
2. **Time Constraints**: Questions often have time limits
3. **Scoring Systems**: Points vary by difficulty, round, or question type
4. **Question Reusability**: Individual questions can be used across multiple quiz nights and rounds
5. **Media Integration**: Images, audio, and video are common
6. **Host Flexibility**: Hosts need to adapt questions to their audience
7. **Content Building Blocks**: Questions are combined by hosts into their own quiz sets
8. **Attribution**: Credit to creators is important in the community

### Repository Focus: Individual Questions

- **Core Unit**: Each entry is an individual question
- **Reusability**: Questions can be used in multiple quiz sets/rounds
- **Metadata**: Round/set fields are optional metadata from imports, not required
- **Host Control**: Hosts select and combine questions into their own quiz structures

---

## Field Ranking System

- **🔴 MANDATORY**: Cannot function without this field
- **🟠 CRITICAL**: Essential for most use cases
- **🟡 IMPORTANT**: Significantly improves functionality
- **🟢 USEFUL**: Adds value but not essential
- **🔵 OPTIONAL**: Nice to have
- **⚪ INCREDIBLY OPTIONAL**: Rarely used but potentially valuable

---

## Ranked Data Fields

### 🔴 MANDATORY FIELDS

#### 1. **Question Text** (`question`)
- **Why Mandatory**: The core content - without it, there's no question
- **Use Cases**: 
  - Display during quiz
  - Read aloud by host
  - Export to various formats
- **Format**: Plain text (may include markdown/formatting)
- **Example**: "What European country has a well-known political party whose name, translated to English, means 'we ourselves'?"
- **Notes**: This is the absolute minimum required field

#### 2. **Creator/Author** (`creator`)
- **Why Mandatory**: Essential for attribution, content management, and user-specific features
- **Use Cases**:
  - Filter content by creator
  - Track who wrote what
  - User-specific imports/exports
  - Content ownership
- **Format**: String (username or full name)
- **Example**: "Caleb Greyman", "Jay", "Sarah"
- **Notes**: Can be auto-filled from logged-in user, but must exist

---

### 🟠 CRITICAL FIELDS

#### 3. **Answer** (`answer`)
- **Why Critical**: Needed to verify responses and provide correct answers
- **Use Cases**:
  - Answer key for hosts
  - Validation during quiz
  - Post-quiz review
  - Answer sheets
- **Format**: String (may include multiple acceptable answers)
- **Example**: "Ireland (Sinn Fein)", "Abu Dhabi", "1969"
- **Variations**: 
  - Multiple acceptable answers (e.g., "Ireland" or "Republic of Ireland")
  - Partial credit answers
  - Answer ranges (e.g., "1969-1970")
- **Notes**: Some question types (e.g., open-ended) may not have definitive answers

#### 4. **Question Type** (`types`)
- **Why Critical**: Determines how question is presented and scored
- **Use Cases**:
  - Formatting display
  - Scoring logic
  - Import/export handling
  - Filtering by question style
- **Format**: Array of strings
- **Common Types**:
  - Multiple Choice
  - True/False
  - Short Answer
  - Fill in the Blank
  - Picture Round
  - Audio Round
  - Video Round
  - Matching
  - Ordering/Sequencing
  - Open Ended
- **Example**: `["Multiple Choice", "Picture Round"]`
- **Notes**: Can affect how options are displayed and how answers are validated

#### 5. **Topics/Categories** (`topics`)
- **Why Critical**: Essential for organizing content into rounds and filtering
- **Use Cases**:
  - Round organization
  - Topic-based filtering
  - Themed quiz nights
  - Content discovery
- **Format**: Array of strings
- **Example**: `["History", "Politics", "Geography", "European History"]`
- **Common Topics**:
  - History, Geography, Science, Sports, Entertainment, Music, Literature, Movies, TV, Politics, Current Events, Pop Culture, etc.
- **Notes**: Questions often belong to multiple topics

---

### 🟡 IMPORTANT FIELDS

#### 6. **Options** (`options`) - For Multiple Choice
- **Why Important**: Essential for multiple-choice questions
- **Use Cases**:
  - Display answer choices
  - Format quiz sheets
  - Validate responses
- **Format**: Array of strings
- **Example**: `["Las Vegas", "Monaco", "Abu Dhabi"]`
- **Notes**: Only relevant for multiple-choice questions

#### 7. **Difficulty Level** (`difficulty`)
- **Why Important**: Helps hosts select appropriate questions for their audience
- **Use Cases**:
  - Difficulty-based filtering
  - Scoring adjustments
  - Audience matching
  - Progressive difficulty in rounds
- **Format**: String (categorical)
- **Common Values**: 
  - "Easy", "Medium", "Hard", "Expert"
  - Or numeric: 1-10 scale
- **Example**: "Medium"
- **Notes**: Subjective but useful for content organization

#### 8. **Date** (`date`)
- **Why Important**: Tracks when content was created/used
- **Use Cases**:
  - Chronological organization
  - Content freshness
  - Event planning
  - Version tracking
- **Format**: Date (YYYY-MM-DD or ISO)
- **Example**: "2025-12-15"
- **Notes**: Can be auto-set to creation date

#### 9. **Round/Set Identifier** (`round` or `set`) - **OPTIONAL METADATA**
- **Why Optional**: These are metadata from imports, not core to the question itself
- **Repository Focus**: This repository stores **individual questions**, not quiz sets
- **Use Cases**:
  - Preserving context from imported files (where question came from)
  - Filtering/searching by original round/set
  - Historical reference (which quiz this question was originally part of)
- **Format**: String
- **Example**: "December 2025 Quiz Night", "Round 1: History"
- **Notes**: 
  - Questions are reusable - a single question can be used in multiple quiz sets
  - Round/set fields are optional metadata, not required
  - Hosts combine questions into their own quiz structures
  - Could be separate fields: `round` (within quiz) and `set` (quiz event)

---

### 🟢 USEFUL FIELDS

### ❌ NOT NEEDED FOR INDIVIDUAL QUESTIONS

#### 6. **Title** (`title`) - **REDUNDANT**
- **Why Not Needed**: 
  - ❌ **Individual questions don't need titles** - the question text IS the identifier
  - ✅ **Question text is more searchable** than a title
  - ✅ **Question text provides full context** - no need for summary
  - ❌ **Auto-generating title from question text is redundant** - just use the question text
- **When Titles ARE Useful**:
  - ✅ Quiz sets/rounds (e.g., "Round 1: History")
  - ✅ Quiz events (e.g., "December 2025 Quiz Night")
  - ✅ Collections of questions
  - ✅ But NOT for individual questions
- **Recommendation**: 
  - Remove `title` from individual question schema
  - Keep `title` only for quiz sets/rounds/events
  - Use question text directly for all question identification needs
- **Current State**: Auto-generated from question text (first 100 chars) - this is unnecessary overhead

### 🟢 USEFUL FIELDS

#### 10. **Point Value** (`points`)
- **Why Useful**: Scoring varies by question difficulty/type
- **Use Cases**:
  - Scoring calculations
  - Difficulty indication
  - Bonus point questions
- **Format**: Integer
- **Example**: `10`, `20`, `50`
- **Notes**: Often varies by quiz format/host preference

#### 11. **Time Limit** (`timer` or `timeLimit`)
- **Why Useful**: Many pub quizzes have time limits per question
- **Use Cases**:
  - Quiz timing
  - Host guidance
  - Format specifications
- **Format**: Integer (seconds)
- **Example**: `30`, `60`, `90`
- **Notes**: May vary by question type

#### 12. **Language** (`language`)
- **Why Useful**: Supports multilingual quizzes
- **Use Cases**:
  - Language filtering
  - International content
  - Translation management
- **Format**: String (ISO language code)
- **Example**: "en", "es", "fr"
- **Default**: "en"
- **Notes**: Most content likely English, but useful for international hosts

#### 13. **Source/Verification URL** (`source`)
- **Why Useful**: Provides a reliable web resource that verifies question accuracy
- **Use Cases**:
  - Fact-checking and verification
  - Attribution to authoritative sources
  - Reference for hosts to verify answers
  - Credibility and trustworthiness
- **Format**: String (URL/web resource)
- **Example**: "https://en.wikipedia.org/wiki/Sinn_Féin", "https://www.bbc.com/news/...", "https://www.britannica.com/..."
- **Notes**: Should be a reliable, accessible web resource that verifies the question's accuracy. Important for credibility and fact-checking.

#### 14. **Tags** (`tags`)
- **Why Useful**: Flexible categorization beyond topics
- **Use Cases**:
  - Flexible search
  - Cross-cutting themes
  - Special events (e.g., "Christmas", "2025", "Championship")
- **Format**: Array of strings
- **Example**: `["2025", "championship", "racing", "sports"]`
- **Notes**: More flexible than topics, allows multiple dimensions

#### 15. **Files/Media** (`files`, `filePaths`)
- **Why Useful**: Many pub quiz questions use images, audio, video
- **Use Cases**:
  - Picture rounds
  - Audio clips
  - Video questions
  - Supporting materials
- **Format**: Array of file paths/URLs
- **Example**: `["uploads/question-image.jpg", "audio/clip.mp3"]`
- **Notes**: Critical for certain question types (picture rounds, audio rounds)

#### 16. **Question Count** (`questionCount`)
- **Why Useful**: Indicates size of question set/round
- **Use Cases**:
  - Round planning
  - Quiz structure
  - Export organization
- **Format**: Integer
- **Example**: `10` (for a round of 10 questions)
- **Notes**: More relevant for sets/rounds than individual questions

#### 17. **Explanation/Notes** (`explanation` or `notes`)
- **Why Useful**: Provides context or interesting facts
- **Use Cases**:
  - Host notes
  - Post-quiz discussion
  - Educational value
  - Fun facts
- **Format**: String (may be long-form text)
- **Example**: "Sinn Fein was founded in 1905 and is one of Ireland's major political parties..."
- **Notes**: Enhances educational value and host confidence

---

### 🔵 OPTIONAL FIELDS

#### 19. **Hint** (`hint`)
- **Why Optional**: Some hosts use hints, others don't
- **Use Cases**:
  - Progressive difficulty
  - Audience assistance
  - Host discretion
- **Format**: String
- **Example**: "It's a European country"
- **Notes**: Not all quiz formats use hints

#### 20. **Related Content** (`relatedContent`)
- **Why Optional**: Links to related questions or content
- **Use Cases**:
  - Themed question sets
  - Follow-up questions
  - Related topics
- **Format**: Array of content IDs
- **Example**: `["question-123", "question-456"]`
- **Notes**: Useful for building comprehensive quiz sets

#### 21. **License** (`license`)
- **Why Optional**: Legal/compliance information
- **Use Cases**:
  - Usage rights
  - Legal compliance
  - Content sharing
- **Format**: String
- **Default**: "CC-BY-4.0" (per repository policy)
- **Example**: "CC-BY-4.0", "All Rights Reserved"
- **Notes**: Important for legal clarity but often standardized

#### 22. **Version** (`version`)
- **Why Optional**: Tracks revisions of questions
- **Use Cases**:
  - Version control
  - Change tracking
  - Quality improvement
- **Format**: String
- **Example**: "1.0", "2.1"
- **Notes**: Useful for content that evolves over time

#### 23. **Last Updated** (`lastUpdated`)
- **Why Optional**: Tracks when content was modified
- **Use Cases**:
  - Change tracking
  - Freshness indicators
  - Audit trail
- **Format**: Timestamp
- **Example**: "2025-12-16T10:30:00Z"
- **Notes**: System can auto-track this

#### 24. **Question Number** (`questionNumber`) - **NOT NEEDED FOR QUESTION REPOSITORY**
- **Why Not Needed**: This repository focuses on individual questions, not quiz sets
- **Status**: Not implemented - questions are standalone, not part of a fixed sequence
- **Notes**: If needed for exports, hosts can number questions when creating their quiz sets

#### 25. **Round Name** (`roundName`) - **REDUNDANT WITH `round`**
- **Why Not Needed**: Already covered by `round` field
- **Status**: Use `round` instead
- **Notes**: This field is redundant - use `round` for round names

#### 26. **Quiz Event** (`quizEvent` or `eventName`) - **REDUNDANT WITH `set`**
- **Why Not Needed**: Already covered by `set` field
- **Status**: Use `set` instead
- **Notes**: This field is redundant - use `set` for quiz event names

#### 27. **Status** (`status`)
- **Why Optional**: Workflow management (draft, published, archived)
- **Use Cases**:
  - Content workflow
  - Quality control
  - Archive management
- **Format**: String (enum)
- **Values**: "draft", "published", "archived", "review"
- **Notes**: Useful for content management workflows

#### 28. **Reviewed By** (`reviewedBy`)
- **Why Optional**: Quality control tracking
- **Use Cases**:
  - Quality assurance
  - Fact-checking
  - Peer review
- **Format**: String (username)
- **Example**: "Sarah", "Admin"
- **Notes**: Useful for collaborative quality control

#### 29. **Reviewed At** (`reviewedAt`)
- **Why Optional**: Tracks when content was reviewed
- **Use Cases**:
  - Quality tracking
  - Audit trail
- **Format**: Timestamp
- **Example**: "2025-12-16T10:30:00Z"
- **Notes**: Complements reviewedBy

---

### ⚪ INCREDIBLY OPTIONAL FIELDS

#### 30. **Alternate Answers** (`alternateAnswers`)
- **Why Incredibly Optional**: Acceptable variations of correct answer
- **Use Cases**:
  - Answer validation flexibility
  - Regional variations
  - Spelling variations
- **Format**: Array of strings
- **Example**: `["Ireland", "Republic of Ireland", "Eire"]`
- **Notes**: Can be handled in answer field with notes, but structured is cleaner

#### 31. **Question Part** (`part` or `subQuestion`)
- **Why Incredibly Optional**: For multi-part questions
- **Use Cases**:
  - Complex questions
  - Bonus parts
  - Progressive questions
- **Format**: Integer or String
- **Example**: `1`, `2`, `"a"`, `"b"`
- **Notes**: Most questions are single-part

#### 32. **Media Type** (`mediaType`)
- **Why Incredibly Optional**: Specifies type of media file
- **Use Cases**:
  - Media handling
  - Display formatting
  - Processing logic
- **Format**: String (enum)
- **Values**: "image", "audio", "video", "document"
- **Notes**: Can be inferred from file extension

#### 33. **Media Description** (`mediaDescription` or `altText`)
- **Why Incredibly Optional**: Accessibility and context
- **Use Cases**:
  - Accessibility (alt text)
  - Host notes
  - Context for media
- **Format**: String
- **Example**: "Map of Europe highlighting Ireland"
- **Notes**: Important for accessibility but often missing

#### 34. **Question Script** (`script` or `hostNotes`)
- **Why Incredibly Optional**: Specific instructions for host
- **Use Cases**:
  - Host guidance
  - Delivery notes
  - Special instructions
- **Format**: String (long-form)
- **Example**: "Read slowly, emphasize 'well-known political party'"
- **Notes**: Very host-specific, rarely standardized

#### 35. **Audience Level** (`audienceLevel`)
- **Why Incredibly Optional**: Target audience specification
- **Use Cases**:
  - Audience matching
  - Difficulty calibration
- **Format**: String
- **Values**: "casual", "intermediate", "expert", "mixed"
- **Notes**: Overlaps with difficulty but more nuanced

#### 36. **Geographic Relevance** (`geographicRelevance`)
- **Why Incredibly Optional**: Regional specificity
- **Use Cases**:
  - Local content
  - Regional filtering
  - Audience matching
- **Format**: String or Array
- **Example**: "UK", "US", "Australia", "Global"
- **Notes**: Most content is global, but some is region-specific

#### 37. **Cultural Context** (`culturalContext`)
- **Why Incredibly Optional**: Cultural specificity
- **Use Cases**:
  - Cultural sensitivity
  - Audience matching
  - Content warnings
- **Format**: String
- **Example**: "Western", "British", "American", "Universal"
- **Notes**: Important for diverse audiences but rarely tracked

#### 38. **Fact Check Status** (`factCheckStatus`)
- **Why Incredibly Optional**: Verification tracking
- **Use Cases**:
  - Quality assurance
  - Credibility
  - Fact-checking workflow
- **Format**: String (enum)
- **Values**: "verified", "unverified", "disputed", "needs-review"
- **Notes**: Important for accuracy but adds overhead

#### 39. **Fact Check Date** (`factCheckDate`)
- **Why Incredibly Optional**: When fact-checking occurred
- **Use Cases**:
  - Freshness tracking
  - Quality assurance
- **Format**: Date
- **Example**: "2025-12-15"
- **Notes**: Facts can become outdated

#### 40. **Usage Count** (`usageCount`)
- **Why Incredibly Optional**: Tracks how often question is used
- **Use Cases**:
  - Popularity metrics
  - Reusability tracking
  - Content analytics
- **Format**: Integer
- **Example**: `15` (used 15 times)
- **Notes**: Useful analytics but not essential

#### 41. **Last Used** (`lastUsed`)
- **Why Incredibly Optional**: When question was last used
- **Use Cases**:
  - Reusability tracking
  - Freshness
  - Avoiding repetition
- **Format**: Date/Timestamp
- **Example**: "2025-12-10"
- **Notes**: Helps hosts avoid repeating questions too soon

#### 42. **Rating** (`rating`)
- **Why Incredibly Optional**: User/audience rating
- **Use Cases**:
  - Quality metrics
  - Popularity
  - Content improvement
- **Format**: Number (e.g., 1-5 stars)
- **Example**: `4.5`
- **Notes**: Subjective but potentially useful

#### 43. **Rating Count** (`ratingCount`)
- **Why Incredibly Optional**: Number of ratings received
- **Use Cases**:
  - Rating credibility
  - Popularity metrics
- **Format**: Integer
- **Example**: `23` (23 people rated)
- **Notes**: Complements rating field

#### 44. **Comments** (`comments`)
- **Use Cases**: User feedback, notes, discussions
- **Format**: Array of comment objects or string
- **Notes**: Community engagement feature

#### 45. **Keywords** (`keywords`)
- **Why Incredibly Optional**: Search optimization
- **Use Cases**:
  - Enhanced search
  - SEO (if web-published)
- **Format**: Array of strings
- **Example**: `["politics", "ireland", "sinn fein", "political parties"]`
- **Notes**: Overlaps with tags but more SEO-focused

#### 46. **Question Format** (`format`)
- **Why Incredibly Optional**: Display/presentation format
- **Use Cases**:
  - Formatting specifications
  - Export handling
- **Format**: String
- **Example**: "standard", "picture-round", "audio-round"
- **Notes**: Overlaps with types but more presentation-focused

#### 47. **Answer Format** (`answerFormat`)
- **Why Incredibly Optional**: Expected answer format
- **Use Cases**:
  - Answer validation
  - Host guidance
- **Format**: String
- **Example**: "single-word", "full-sentence", "number", "date"
- **Notes**: Helps with answer validation

#### 48. **Time Period** (`timePeriod`)
- **Why Incredibly Optional**: Historical context
- **Use Cases**:
  - Historical organization
  - Timeline questions
- **Format**: String
- **Example**: "1900s", "2020s", "Ancient", "Modern"
- **Notes**: Useful for history questions

#### 49. **Subject Area** (`subjectArea`)
- **Why Incredibly Optional**: Academic subject classification
- **Use Cases**:
  - Educational organization
  - Academic alignment
- **Format**: String
- **Example**: "Political Science", "World History", "Geography"
- **Notes**: More academic than "topics"

#### 50. **Bloom's Taxonomy Level** (`bloomsLevel`)
- **Why Incredibly Optional**: Educational classification
- **Use Cases**:
  - Educational alignment
  - Cognitive level tracking
- **Format**: String
- **Values**: "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"
- **Notes**: Very academic, rarely used in pub quizzes

---

## Field Groupings by Use Case

### Core Question Data (Mandatory)
- Question Text
- Creator

### Answer Data (Critical)
- Answer
- Options (for multiple-choice)

### Organization Data (Critical/Important)
- Topics/Categories
- Question Type
- Title
- Round/Set Identifier

### Scoring & Difficulty (Important/Useful)
- Difficulty Level
- Point Value
- Time Limit

### Metadata (Useful/Optional)
- Date
- Language
- Source
- Tags
- Files/Media

### Workflow & Quality (Optional)
- Status
- Reviewed By
- Version
- Last Updated

### Analytics & Engagement (Incredibly Optional)
- Usage Count
- Rating
- Comments
- Last Used

---

## Recommendations

### Minimum Viable Schema
For a functional pub quiz repository, these fields are essential:
1. `question` (mandatory)
2. `creator` (mandatory)
3. `answer` (critical)
4. `types` (critical)
5. `topics` (critical)

### Recommended Schema
Add these for a robust system:
6. `title` (important)
7. `options` (important - for MC questions)
8. `difficulty` (important)
9. `date` (important)
10. `points` (useful)
11. `files` (useful - for media)
12. `tags` (useful)

### Enhanced Schema
For advanced features:
13. `round`/`set` (useful)
14. `explanation` (useful)
15. `timer` (useful)
16. `source` (useful)
17. `relatedContent` (optional)
18. `status` (optional)

---

## Field Dependencies

### Conditional Fields
- **`options`**: Only needed if `types` includes "Multiple Choice"
- **`hint`**: Optional enhancement, not required
- **`explanation`**: Nice-to-have but not essential
- **`mediaType`**: Only relevant if `files` contains media

### Field Relationships
- **`difficulty`** + **`points`** = Scoring system
- **`topics`** + **`tags`** = Comprehensive categorization
- **`creator`** + **`date`** + **`version`** = Content tracking
- **`round`** + **`set`** = Optional metadata from imports (not core to question)

---

## Implementation Priorities

### Phase 1: Core (Must Have)
- Question, Creator, Answer, Types, Topics

### Phase 2: Essential (Should Have)
- Options (for MC), Difficulty, Date

### Phase 3: Important (Nice to Have)
- Points, Files, Tags, Round/Set (optional metadata from imports)

### Phase 4: Enhanced (Future)
- Timer, Explanation, Source, Related Content

### Phase 5: Advanced (Maybe)
- Status, Version, Review fields, Analytics

**Note**: `title` removed from phases - not needed for individual questions

---

## Conclusion

The **minimum viable pub quiz repository** requires only **5 fields**:
1. **Question** (the content) - This IS the identifier, no title needed
2. **Creator** (attribution)
3. **Answer** (verification)
4. **Types** (format)
5. **Topics** (organization)

### Key Insight: Title is Redundant for Individual Questions

**Individual trivia questions don't need titles** because:
- The question text itself is the best identifier
- Question text is more searchable than a title
- Question text provides full context
- Titles add redundancy without value

**Titles ARE useful for**:
- Quiz sets/rounds (e.g., "Round 1: History")
- Quiz events (e.g., "December 2025 Quiz Night")
- Collections of questions
- But NOT for individual questions

### Recommended Schema

A **robust system** benefits from **11-14 fields**:
- Core 5 fields (above)
- Options (for MC questions)
- Difficulty, Date
- Points, Files, Tags
- Round/Set (for organizing into quiz events)

The **ideal system** might have **20+ fields** for comprehensive content management, but many fields are **incredibly optional** and can be added incrementally based on actual user needs.

**Key Insight**: Start with the minimum, add fields based on real user feedback and use cases. **Remove redundant fields like `title` for individual questions** - the question text is sufficient. Over-engineering with too many optional fields can complicate the system without adding value.

