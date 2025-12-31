# Import Process Improvements

## Current State
- Multiple pages: `/import`, `/configure-import`, `/configure-trivnow`, `/configure-excel`
- Users must manually map columns to fields
- Complex configuration process
- No preview before import
- Multiple steps that can be confusing

## Proposed: Unified Smart Import Experience

### Core Principles
1. **One-Page Workflow**: Everything happens on a single page
2. **Smart Auto-Detection**: Automatically detect and map columns
3. **Visual Preview**: Show exactly what will be imported before processing
4. **Progressive Disclosure**: Simple by default, advanced options available
5. **Instant Feedback**: Real-time validation and error detection

### User Flow

#### Step 1: Upload (Automatic)
- User drags & drops or selects file
- System automatically:
  - Detects file type (CSV/Excel)
  - Parses headers
  - Suggests column mappings based on header names
  - Shows preview of first 3-5 rows

#### Step 2: Review & Adjust (If Needed)
- Visual table showing:
  - Source columns (from file)
  - Mapped fields (our system fields)
  - Sample data preview
  - Validation status (✅/⚠️/❌)
- User can:
  - Adjust mappings via dropdowns
  - See field descriptions on hover
  - Fix validation errors inline
  - Skip columns they don't need

#### Step 3: Import
- One-click import button
- Progress indicator with:
  - Current row being processed
  - Success/error counts
  - Estimated time remaining
- Results summary:
  - ✅ X questions imported successfully
  - ⚠️ Y warnings (with details)
  - ❌ Z errors (with details and ability to retry)

### Smart Detection Features

#### Column Name Matching
Automatically match common column names:
- Question: "question", "q", "text", "prompt", "query"
- Answer: "answer", "a", "correct", "solution", "key"
- Creator: "creator", "author", "created by", "writer"
- Topics: "topic", "category", "subject", "tags", "theme"
- Date: "date", "created", "published", "timestamp"
- Points: "points", "score", "value", "weight"
- Timer: "timer", "time", "duration", "seconds"
- Options: "options", "choices", "alternatives", "distractors"

#### Format Detection
- Detect multiple-choice format (columns like A, B, C, D or Option 1, Option 2)
- Detect semicolon-delimited options in single column
- Detect date formats automatically
- Detect numeric fields (points, timer)

#### Data Validation
- Required fields check (question, creator)
- Data type validation (points = number, date = valid date)
- Duplicate detection (warn if same question exists)
- Format suggestions (e.g., "This looks like a date, format as YYYY-MM-DD?")

### UI/UX Improvements

#### Visual Design
- Clean, modern interface
- Color-coded status indicators
- Responsive table with horizontal scroll if needed
- Sticky header row for easy reference
- Highlighted errors/warnings

#### User Guidance
- Contextual help tooltips
- Example data for each field type
- "What's this?" links to field descriptions
- Suggested mappings with confidence scores
- One-click "Use Suggested Mappings" button

#### Error Handling
- Inline error messages
- Clear explanation of what went wrong
- Suggestions for how to fix
- Ability to download failed rows as CSV for correction

### Technical Implementation

#### New Components Needed
1. `SmartImportWizard.tsx` - Main import component
2. `ColumnMapper.tsx` - Visual column mapping interface
3. `ImportPreview.tsx` - Preview table component
4. `ImportProgress.tsx` - Progress indicator
5. `ImportResults.tsx` - Results summary

#### API Enhancements
- `/api/import/detect` - Auto-detect column mappings
- `/api/import/validate` - Validate data before import
- `/api/import/preview` - Get preview of parsed data
- `/api/import/process` - Process import with progress updates

### Migration Path
1. Keep existing import pages for backward compatibility
2. Add new unified import page at `/import-new` (or replace `/import`)
3. Add "Try New Import Experience" banner on old pages
4. Collect feedback and iterate
5. Eventually deprecate old pages

### Benefits
- **Faster**: Auto-detection reduces manual work by 80%
- **Easier**: One page instead of multiple
- **Safer**: Preview before import prevents mistakes
- **Smarter**: Learns from user corrections
- **Better UX**: Clear feedback and guidance throughout

