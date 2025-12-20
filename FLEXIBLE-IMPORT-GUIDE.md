# Flexible Import Configuration System

## Overview

The flexible import system allows hosts to upload an example file of their content format, and the system guides them through mapping their columns to our content management system. This makes it easy for any host to import their content, regardless of their file format.

## How It Works

### Step 1: Configure Your Format

1. Navigate to **"⚙️ Configure Import Format"** (`/configure-import`)
2. Select or create a user
3. Upload an example file (CSV, Excel, or JSON)
4. Review the preview of your data
5. Map each column to our system fields:
   - **Required**: Question, Creator
   - **Optional**: Answer, Title, Date, Topics, Types, Difficulty, Tags, Source, Language, Options, etc.
6. Test the mapping to see how your data will be transformed
7. Save the configuration with a name (e.g., "My Trivia Format")

### Step 2: Import Content

1. Navigate to **"Import CSV/Excel"** (`/import`)
2. Select your user
3. (Optional) Select a saved configuration from the dropdown
4. Upload your file
5. The system will:
   - Auto-detect if your file matches a saved configuration
   - Apply the column mappings automatically
   - Show you a preview of the mapped data
6. Review and adjust mappings if needed
7. Set a default creator (if not mapped)
8. Click "Import" to import all rows

## Features

### Multi-Format Support
- **CSV** files (.csv)
- **Excel** files (.xlsx, .xls)
- **JSON** files (.json)

### Auto-Detection
- Automatically detects file type
- Attempts to match headers to saved configurations
- Suggests column mappings based on column names

### Guided Mapping
- Step-by-step wizard interface
- Clear field descriptions
- Required vs optional field indicators
- Sample data preview for each column

### Test Before Import
- Preview how your data will be transformed
- Validate that required fields are mapped
- See exactly what will be imported

### Multiple Configurations
- Save multiple import formats per user
- Switch between formats easily
- Each format is user-specific

## Field Mapping Guide

### Required Fields
- **Question**: The actual trivia question text
- **Creator**: Who created/wrote this content

### Common Optional Fields
- **Answer**: The correct answer
- **Title**: Short title/identifier (auto-generated from question if not provided)
- **Date**: When the question was created
- **Topics**: Categories/subjects (comma-separated)
- **Types**: Question type/format (comma-separated)
- **Difficulty**: Easy, Medium, Hard, etc.
- **Tags**: Additional keywords
- **Options**: For multiple-choice questions (array of answer options)

### Special Handling

#### Multiple-Choice Questions
- If you have a "Type" column indicating "Multiple Choice" or similar
- The system will automatically:
  - Detect answer options in subsequent rows
  - Collect all options into an `options` array
  - Identify the correct answer (marked with X, ✓, or √)
  - Store options separately from question text

#### Array Fields
Fields like `topics`, `types`, and `tags` can accept comma-separated values:
- Example: "science,physics,chemistry" → `["science", "physics", "chemistry"]`

## Example Workflow

### Scenario: Host "Sarah" wants to import her Excel trivia questions

1. **Configure Format**:
   - Sarah goes to `/configure-import`
   - Uploads `my-trivia-questions.xlsx`
   - Sees columns: "Question", "Answer", "Category", "Points"
   - Maps:
     - Question → Question
     - Answer → Answer
     - Category → Topics
     - Points → Skip (not needed)
   - Tests mapping, sees preview looks good
   - Saves as "Sarah's Trivia Format"

2. **Import Content**:
   - Sarah goes to `/import`
   - Selects "Sarah's Trivia Format" from dropdown
   - Uploads `new-questions.xlsx`
   - System auto-detects format and applies mappings
   - Sarah reviews, sets default creator to "Sarah"
   - Clicks "Import" → All questions imported!

## Technical Details

### Configuration Storage
- Configurations stored in `localStorage` per user
- Key format: `import-config-{username}-{format-name}`
- Includes:
  - Column mappings
  - Detection patterns
  - File type
  - Sheet name (for Excel)
  - Multiple-choice detection settings

### Legacy Support
- Still supports old TrivNow and Excel configurations
- Automatically loads and converts to new system
- Backward compatible with existing imports

### Detection Logic
1. Check if user selected a configuration
2. If not, try to match file headers to saved configurations
3. Fall back to legacy TrivNow/Excel configs
4. If no match, show manual mapping interface

## Tips for Hosts

1. **Use Descriptive Format Names**: "My Weekly Trivia" is better than "Format 1"
2. **Include Sample Data**: Upload files with 2-3 example rows for better preview
3. **Test First**: Always test your mapping before importing large files
4. **Set Default Creator**: If your files don't have a creator column, set a default
5. **Multiple Formats**: You can configure multiple formats (e.g., one for weekly trivia, one for special events)

## Troubleshooting

### "Missing creator" errors
- Set a default creator in the import form
- Or map a column to "Creator"

### "Missing title" errors
- Title is optional and will be auto-generated from question text
- Or map a column to "Title"

### Options not showing for multiple-choice
- Make sure you have a "Type" column indicating multiple-choice
- Check that answer options are in subsequent rows
- Verify X/✓ marks are in the correct column

### Configuration not detected
- Make sure you've saved the configuration
- Check that file type matches (CSV vs Excel)
- Try selecting the configuration manually from dropdown

