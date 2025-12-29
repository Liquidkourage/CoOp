# Trivia Content Repository - Analysis & Next Steps

**Date:** December 23, 2024  
**Status:** In Progress - Relational Model Implementation

---

## 📊 Current State Analysis

### ✅ **COMPLETED**

1. **Database Schema**
   - ✅ `rounds` table created with proper structure
   - ✅ `sets` table created with proper structure
   - ✅ Junction tables created:
     - `question_rounds` (many-to-many: questions ↔ rounds)
     - `question_sets` (many-to-many: questions ↔ sets)
     - `round_sets` (many-to-many: rounds ↔ sets)
   - ✅ Database functions implemented:
     - `insertRound()`, `insertSet()`
     - `getAllRounds()`, `getAllSets()`
     - `getRoundById()`, `getSetById()`
     - `addQuestionToRound()`, `addQuestionToSet()`, `addRoundToSet()`
     - `getQuestionsInRound()`, `getQuestionsInSet()`, `getRoundsInSet()`
     - `getRoundsForQuestion()`, `getSetsForQuestion()`, `getSetsForRound()`

2. **Basic API Routes**
   - ✅ `GET /api/rounds` - List all rounds
   - ✅ `POST /api/rounds` - Create new round
   - ✅ `GET /api/sets` - List all sets
   - ✅ `POST /api/sets` - Create new set

3. **Basic UI Pages**
   - ✅ `/rounds` - Browse all rounds (list view)
   - ✅ `/sets` - Browse all sets (list view)
   - ✅ Navigation updated to include rounds/sets links

4. **Field Updates**
   - ✅ Removed `title` requirement from questions
   - ✅ Added new fields: `points`, `timer`, `explanation`, `notes`, `alternateAnswers`, `source`
   - ✅ Updated `source` field to be URL/web resource for verification
   - ✅ Updated all import/export flows to handle new fields

---

## ⚠️ **ISSUES IDENTIFIED**

### 🔴 **CRITICAL ISSUES**

1. **Database Schema Inconsistency**
   - ❌ `content_items` table still has `round TEXT` and `set TEXT` columns (lines 60-64 in `lib/db.ts`)
   - ❌ These columns are being used in `insertContent()` (lines 237-238)
   - ❌ **Problem:** Questions should use junction tables (`question_rounds`, `question_sets`) instead of TEXT columns
   - ❌ **Impact:** Data inconsistency - questions can be linked via TEXT fields OR junction tables, causing confusion

2. **Missing Detail Pages**
   - ❌ `/rounds/[id]/page.tsx` - Does not exist (needed to view round details and questions)
   - ❌ `/sets/[id]/page.tsx` - Does not exist (needed to view set details, questions, and rounds)

3. **Missing API Routes**
   - ❌ `GET /api/rounds/[id]` - Get round details
   - ❌ `POST /api/rounds/[id]/questions` - Add question to round
   - ❌ `GET /api/sets/[id]` - Get set details
   - ❌ `POST /api/sets/[id]/questions` - Add question to set
   - ❌ `POST /api/sets/[id]/rounds` - Add round to set

### 🟡 **HIGH PRIORITY**

4. **Submit Flow Not Integrated**
   - ❌ Submit page (`/submit`) has `round` and `set` as TEXT fields
   - ❌ When submitting, it stores `round`/`set` as TEXT in `content_items` table
   - ❌ **Should:** Create/find round/set entities and link via junction tables
   - ❌ **Missing:** UI to create new rounds/sets during submission
   - ❌ **Missing:** Logic to handle "create new round/set" vs "link to existing"

5. **Import Flow Not Integrated**
   - ❌ Import page doesn't detect when uploading a round or set
   - ❌ Import flow doesn't create round/set entities
   - ❌ Import flow doesn't link questions to rounds/sets via junction tables
   - ❌ **Missing:** Detection logic for round/set imports
   - ❌ **Missing:** Batch creation of rounds/sets from import data

6. **Question Display Missing Relationships**
   - ❌ Main page (`/`) doesn't show which rounds/sets a question belongs to
   - ❌ Questions display `round` and `set` as TEXT fields (from old schema)
   - ❌ **Should:** Query junction tables to show actual round/set relationships
   - ❌ **Missing:** Links to view rounds/sets from question cards

### 🟢 **MEDIUM PRIORITY**

7. **Export Functionality**
   - ⚠️ Export includes `round` and `set` as TEXT fields
   - ⚠️ Should export actual round/set relationships from junction tables
   - ⚠️ May need to export round/set metadata separately

8. **Search/Filter**
   - ⚠️ Search doesn't filter by round/set relationships
   - ⚠️ Missing filters for "questions in round X" or "questions in set Y"

---

## 🎯 **NEXT STEPS (Prioritized)**

### **PHASE 1: Fix Database Schema** 🔴 **CRITICAL**

**Goal:** Remove TEXT columns, use junction tables only

1. **Migration Script**
   - Create migration to:
     - Read existing `round`/`set` TEXT values from `content_items`
     - Create round/set entities if they don't exist
     - Link questions to rounds/sets via junction tables
     - Remove `round` and `set` columns from `content_items`

2. **Update `lib/db.ts`**
   - Remove `round` and `set` from `ContentRow` interface
   - Remove `round` and `set` from `insertContent()` parameters
   - Remove `round` and `set` from INSERT query
   - Remove indexes on `round`/`set` columns

3. **Update All References**
   - Remove `round`/`set` from `app/api/submit/route.ts`
   - Remove `round`/`set` from `app/api/content/route.ts`
   - Remove `round`/`set` from `app/api/search/route.ts`
   - Update `app/page.tsx` to remove round/set TEXT display
   - Update export functions to use junction tables

**Estimated Time:** 2-3 hours

---

### **PHASE 2: Complete API Routes** 🔴 **CRITICAL**

**Goal:** Full CRUD for rounds and sets

1. **Create `/app/api/rounds/[id]/route.ts`**
   ```typescript
   GET /api/rounds/[id] - Get round with questions
   ```

2. **Create `/app/api/rounds/[id]/questions/route.ts`**
   ```typescript
   POST /api/rounds/[id]/questions - Add question to round
   Body: { questionId: number, sequence?: number }
   ```

3. **Create `/app/api/sets/[id]/route.ts`**
   ```typescript
   GET /api/sets/[id] - Get set with questions and rounds
   ```

4. **Create `/app/api/sets/[id]/questions/route.ts`**
   ```typescript
   POST /api/sets/[id]/questions - Add question to set
   Body: { questionId: number, sequence?: number }
   ```

5. **Create `/app/api/sets/[id]/rounds/route.ts`**
   ```typescript
   POST /api/sets/[id]/rounds - Add round to set
   Body: { roundId: number, sequence?: number }
   ```

**Estimated Time:** 1-2 hours

---

### **PHASE 3: Create Detail Pages** 🔴 **CRITICAL**

**Goal:** Users can view round/set details

1. **Create `/app/rounds/[id]/page.tsx`**
   - Display round metadata (name, creator, date, topics, description)
   - List all questions in the round (ordered by sequence)
   - Show question cards with full details
   - Link back to rounds list

2. **Create `/app/sets/[id]/page.tsx`**
   - Display set metadata (name, creator, date, topics, description)
   - List all questions in the set (ordered by sequence)
   - List all rounds in the set (ordered by sequence)
   - Show question/round cards with full details
   - Link back to sets list

**Estimated Time:** 2-3 hours

---

### **PHASE 4: Integrate Submit Flow** 🟡 **HIGH PRIORITY**

**Goal:** Users can create rounds/sets when submitting questions

1. **Update `/app/submit/page.tsx`**
   - Replace TEXT `round`/`set` inputs with:
     - Dropdown to select existing round/set
     - Option to "Create New Round/Set"
     - Modal/form to create new round/set inline
   - On submit:
     - If new round/set created, create entity first
     - Link question to round/set via junction table
     - Don't store TEXT values

2. **Update `/app/api/submit/route.ts`**
   - Handle round/set creation if needed
   - Use `addQuestionToRound()` / `addQuestionToSet()` instead of TEXT fields
   - Return success with round/set IDs

**Estimated Time:** 3-4 hours

---

### **PHASE 5: Integrate Import Flow** 🟡 **HIGH PRIORITY**

**Goal:** Import can create rounds/sets and link questions

1. **Update `/app/import/page.tsx`**
   - Detect round/set columns in import data
   - Group questions by round/set
   - Create round/set entities for each unique round/set name
   - Link questions to rounds/sets via junction tables
   - Handle sequence ordering

2. **Batch Processing**
   - Create all rounds/sets first
   - Then create all questions
   - Then link questions to rounds/sets

**Estimated Time:** 4-5 hours

---

### **PHASE 6: Update Question Display** 🟡 **HIGH PRIORITY**

**Goal:** Show round/set relationships on questions

1. **Update `/app/page.tsx`**
   - Query `getRoundsForQuestion()` and `getSetsForQuestion()` for each question
   - Display round/set badges/links on question cards
   - Clicking badge navigates to round/set detail page

2. **Update `/app/api/content/route.ts`**
   - Include round/set relationships in response
   - Or create separate endpoint to fetch relationships

**Estimated Time:** 2-3 hours

---

### **PHASE 7: Export & Search Enhancements** 🟢 **MEDIUM PRIORITY**

1. **Update Export Functions**
   - Export round/set relationships from junction tables
   - Include round/set names in exports

2. **Add Search Filters**
   - Filter by round
   - Filter by set
   - Filter by "questions in round X"

**Estimated Time:** 2-3 hours

---

## 📋 **Summary Checklist**

### Critical (Must Do First)
- [ ] Fix database schema - remove TEXT columns, use junction tables
- [ ] Create detail pages for rounds/[id] and sets/[id]
- [ ] Create missing API routes for round/set details and relationships

### High Priority (Do Next)
- [ ] Integrate submit flow with round/set creation
- [ ] Integrate import flow with round/set detection
- [ ] Update question display to show round/set relationships

### Medium Priority (Polish)
- [ ] Update export to use junction tables
- [ ] Add search filters for rounds/sets

---

## 🔍 **Key Files to Modify**

### Database Layer
- `lib/db.ts` - Remove round/set TEXT columns, update interfaces

### API Routes
- `app/api/submit/route.ts` - Use junction tables
- `app/api/content/route.ts` - Include relationships
- `app/api/search/route.ts` - Filter by relationships
- `app/api/rounds/[id]/route.ts` - **CREATE**
- `app/api/rounds/[id]/questions/route.ts` - **CREATE**
- `app/api/sets/[id]/route.ts` - **CREATE**
- `app/api/sets/[id]/questions/route.ts` - **CREATE**
- `app/api/sets/[id]/rounds/route.ts` - **CREATE**

### UI Pages
- `app/submit/page.tsx` - Round/set creation UI
- `app/import/page.tsx` - Round/set detection and creation
- `app/page.tsx` - Show relationships
- `app/rounds/[id]/page.tsx` - **CREATE**
- `app/sets/[id]/page.tsx` - **CREATE**

---

## 💡 **Recommendations**

1. **Start with Phase 1** - Fix the database schema first. Everything else depends on this.

2. **Test Incrementally** - After each phase, test thoroughly before moving to the next.

3. **Migration Strategy** - For Phase 1, consider:
   - Backup database first
   - Run migration script
   - Verify data integrity
   - Deploy schema changes
   - Update application code

4. **User Experience** - For submit/import flows:
   - Make round/set creation optional
   - Auto-suggest existing rounds/sets as user types
   - Show clear feedback when creating new entities

5. **Performance** - Consider:
   - Caching round/set lists
   - Batch loading relationships
   - Indexing junction tables (already done ✅)

---

## 🚀 **Ready to Start?**

**Recommended First Step:** Phase 1 - Fix Database Schema

This is the foundation for everything else. Once the schema is correct, the rest will be much easier to implement.

Would you like me to:
1. Create the migration script?
2. Update the database schema?
3. Start with a specific phase?

