# Navigation Guide - Trivia Content Repository

This guide explains what each navigation button does and when to use it.

---

## 🏠 **Home**
**What it does:** The main landing page and content browser

**Features:**
- **Search Content** - Search through all questions by keywords, topics, creator, difficulty
- **Browse** - View all content with pagination
- **Statistics** - See repository stats (total items, topics, creators)
- **Browse by Topic** - Filter and view questions by topic
- **Browse by Creator** - Filter and view questions by creator
- **Export Views** - Multiple export formats:
  - Q&A Pairs - Copy-friendly question/answer format
  - Quiz Format - Numbered quiz style
  - Spreadsheet - Tab-separated for Excel
  - Plain Text - Raw text export
  - Flashcards - Interactive flashcards
  - Bulk Copy - Select multiple items to copy
  - Document - Word/Google Docs format
  - Structured - JSON/CSV export

**When to use:** Start here to browse, search, or export content

---

## 📋 **Rounds**
**What it does:** Browse and view rounds (collections of questions)

**Features:**
- Lists all rounds in the repository
- Click a round to see its details and all questions in that round
- Questions are displayed in sequence order
- Shows round metadata (creator, date, topics, description)

**When to use:** 
- To see what rounds exist
- To view all questions in a specific round
- To understand how questions are organized into rounds

**Note:** Rounds are created automatically when you import content with round information, or can be created manually when submitting questions.

---

## 📚 **Sets**
**What it does:** Browse and view sets (collections of questions and/or rounds)

**Features:**
- Lists all sets in the repository
- Click a set to see:
  - All rounds included in the set
  - All questions directly in the set
  - Set metadata (creator, date, topics, description)

**When to use:**
- To see what quiz sets/events exist
- To view a complete quiz (all rounds and questions)
- To understand how rounds and questions are organized into complete quizzes

**Note:** Sets are created automatically when you import content with set/event information, or can be created manually.

---

## ➕ **Submit Content**
**What it does:** Manually submit individual trivia questions

**Features:**
- Form to enter a single question with all metadata:
  - **Required:** Question text, Creator
  - **Optional:** Answer, Topics, Difficulty, Points, Timer, Round, Set, Explanation, Notes, Alternate Answers, Source (URL), Media files
- Upload media files (images, audio, video) for the question
- Automatically links questions to rounds/sets if specified

**When to use:**
- Adding individual questions one at a time
- Adding questions with media files
- Quick manual entry

**Note:** For bulk imports, use "Import CSV/Excel" instead.

---

## 📥 **Import CSV/Excel**
**What it does:** Bulk import questions from CSV or Excel files

**Features:**
- Upload CSV or Excel files
- Automatically detects column structure
- Uses saved import configurations (if configured)
- Supports multiple question types (multiple-choice, true/false, etc.)
- Can import hundreds of questions at once
- Automatically creates rounds/sets if round/set columns are present

**When to use:**
- Importing many questions at once
- Importing from existing spreadsheets
- Bulk data entry

**Workflow:**
1. Upload your CSV/Excel file
2. System auto-detects columns (or use a saved configuration)
3. Preview the data
4. Click "Import" to add all questions

**Note:** Configure your import format first using "Configure Import Format" for better results.

---

## ⚙️ **Configure Import Format**
**What it does:** Set up custom column mappings for CSV/Excel imports

**Features:**
- Create reusable import configurations
- Map your file's columns to system fields
- Save configurations per user
- Test mappings before importing
- Supports CSV, Excel, and JSON formats
- Handles multiple-choice question detection
- Configure grouping fields and detection patterns

**When to use:**
- Before importing files with non-standard column names
- When you regularly import from the same format
- To set up automatic column detection

**Workflow:**
1. Upload a sample file
2. Map columns to system fields
3. Test the mapping
4. Save the configuration with a name
5. Use it when importing similar files

**Example:** If your CSV has a column called "Q" instead of "Question", map "Q" → "Question"

---

## 🗑️ **Delete Content**
**What it does:** Admin tool to delete content by creator name

**Features:**
- Search for all content by a specific creator
- Preview what will be deleted
- Delete all content from a creator at once
- Shows warning before deletion
- **Permanent** - cannot be undone

**When to use:**
- Removing all content from a specific creator
- Cleaning up test data
- Admin maintenance tasks

**⚠️ Warning:** This permanently deletes content. Use with caution!

---

## 📋 **Configure TrivNow (Legacy)**
**What it does:** Legacy configuration page for TrivNow CSV format

**Features:**
- Specifically designed for TrivNow CSV exports
- Pre-configured mappings for TrivNow column names
- Saves configuration per user
- Simpler than the general "Configure Import Format"

**When to use:**
- If you're importing from TrivNow specifically
- For quick TrivNow imports without full configuration

**Note:** This is a legacy page. "Configure Import Format" is more flexible and recommended for new setups.

---

## 📊 **Configure Excel (Legacy)**
**What it does:** Legacy configuration page for Excel format

**Features:**
- Specifically designed for Excel files
- Pre-configured mappings for common Excel column names
- Saves configuration per user
- Simpler than the general "Configure Import Format"

**When to use:**
- If you're importing from Excel specifically
- For quick Excel imports without full configuration

**Note:** This is a legacy page. "Configure Import Format" is more flexible and recommended for new setups.

---

## 🔐 **Login** (Hidden when logged in)
**What it does:** Simple username-based login

**Features:**
- Enter username (no password required)
- Username is remembered in browser
- Shows list of previous users for quick login
- Can switch between users

**When to use:**
- First time using the site
- To switch to a different user
- To log out and log back in

**Note:** The login link disappears from navigation when you're already logged in. Use "Switch User" button in the header instead.

---

## Summary Workflow Examples

### **Adding Questions:**
1. **Single question:** Submit Content → Fill form → Submit
2. **Many questions:** Configure Import Format → Import CSV/Excel → Upload file → Import

### **Finding Questions:**
1. **Search:** Home → Search tab → Enter keywords
2. **Browse by topic:** Home → Topics tab → Click topic
3. **Browse by creator:** Home → Creators tab → Click creator
4. **View round:** Rounds → Click round name
5. **View set:** Sets → Click set name

### **Exporting Questions:**
1. Home → Search/Browse to find questions
2. Select view mode (Q&A Pairs, Quiz Format, etc.)
3. Use export buttons (Copy, Download CSV, etc.)

### **Organizing Content:**
- Questions can belong to multiple rounds
- Rounds can belong to multiple sets
- Sets contain both questions and rounds
- Use rounds to group related questions
- Use sets to create complete quizzes/events

---

## Quick Tips

- **Login is optional** - You can browse and search without logging in
- **Login helps track** - Your submissions are tagged with your username
- **Configurations are saved** - Once you configure an import format, it's saved for future use
- **Export before deleting** - Always export content before deleting if you might need it later
- **Use rounds/sets** - Organize questions into rounds, then rounds into sets for complete quizzes

