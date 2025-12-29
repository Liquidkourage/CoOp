# Next Steps Roadmap - Pub Quiz Content Repository

Based on our comprehensive field analysis, here's a prioritized roadmap for improving the repository.

---

## 🎯 Current State Assessment

### ✅ What's Working Well
- Core import/export functionality (CSV, Excel, JSON)
- Flexible import configuration wizard
- User-specific configurations
- Multiple display/export formats
- Database storage with PostgreSQL
- Basic search and filtering

### ⚠️ Issues Identified
1. **`title` field is redundant** - Still being auto-generated and stored, but not needed for individual questions
2. **Field validation** - Need to align with analysis (question + creator = mandatory)
3. **Missing important fields** - Some useful fields not yet implemented (points, timer, round/set)
4. **Export templates** - No save/load custom export templates yet
5. **Content editing** - No way to edit questions after import

---

## 📋 Prioritized Next Steps

### Phase 1: Clean Up & Align with Analysis (High Priority)

#### 1.1 Remove/Deprecate `title` Field
**Why**: We've determined `title` is redundant for individual questions
**Actions**:
- [ ] Remove `title` from required fields in forms
- [ ] Stop auto-generating `title` from question text
- [ ] Update database schema to make `title` nullable (already is)
- [ ] Update UI to not display/require `title` for individual questions
- [ ] Keep `title` field in database for backward compatibility (don't break existing data)
- [ ] Update documentation to clarify `title` is only for sets/rounds/events

**Impact**: Cleaner data model, less confusion, aligns with analysis

#### 1.2 Strengthen Field Validation
**Why**: Ensure mandatory fields (question, creator) are properly validated
**Actions**:
- [ ] Review all import paths to ensure `question` is required
- [ ] Ensure `creator` defaults to logged-in user if not provided
- [ ] Add clear validation messages
- [ ] Update error handling to be more user-friendly

**Impact**: Better data quality, fewer import errors

---

### Phase 2: Add Missing Important Fields (Medium Priority)

#### 2.1 Add `points` Field
**Why**: Scoring is important for pub quizzes
**Actions**:
- [ ] Add `points` to ContentMetadata interface
- [ ] Add `points` column to database (INTEGER, nullable)
- [ ] Add `points` to import/export mappings
- [ ] Update UI to display points
- [ ] Add points to export formats

**Impact**: Better scoring support

#### 2.2 Add `timer`/`timeLimit` Field
**Why**: Many pub quizzes have time limits per question
**Actions**:
- [ ] Add `timer` or `timeLimit` to ContentMetadata interface
- [ ] Add column to database (INTEGER seconds, nullable)
- [ ] Add to import/export mappings
- [ ] Display in UI (optional)

**Impact**: Support timed questions

#### 2.3 Add `round`/`set` Fields
**Why**: Questions are organized into rounds/sets for quiz events
**Actions**:
- [ ] Add `round` and `set` fields to ContentMetadata
- [ ] Add columns to database (TEXT, nullable)
- [ ] Add to import/export mappings
- [ ] Add filtering by round/set
- [ ] Group questions by round/set in UI

**Impact**: Better organization for quiz events

#### 2.4 Add `explanation`/`notes` Field
**Why**: Hosts benefit from context and explanations
**Actions**:
- [ ] Add `explanation` field to ContentMetadata
- [ ] Add column to database (TEXT, nullable)
- [ ] Add to import/export mappings
- [ ] Display in UI (collapsible section)

**Impact**: Enhanced educational value

---

### Phase 3: Enhance Export System (Medium Priority)

#### 3.1 Export Template System
**Why**: Users want to save/load custom export formats
**Actions**:
- [ ] Create export template configuration UI
- [ ] Save templates to localStorage (user-specific)
- [ ] Load templates in export page
- [ ] Allow sharing templates (future: database storage)

**Impact**: Better user experience, reusable export formats

#### 3.2 Downloadable File Exports
**Why**: Copy-paste is good, but file downloads are better
**Actions**:
- [ ] Add CSV download button
- [ ] Add Excel download button
- [ ] Add PDF export (formatted quiz sheets)
- [ ] Add JSON export (for round-trip imports)

**Impact**: Professional export options

---

### Phase 4: Content Management (Lower Priority)

#### 4.1 Content Editing
**Why**: Hosts may want to edit questions after import
**Actions**:
- [ ] Create edit page/component
- [ ] Add edit button to question cards
- [ ] Update database on save
- [ ] Track edit history (optional)

**Impact**: Better content management

#### 4.2 Bulk Operations
**Why**: Hosts may want to edit/delete multiple questions
**Actions**:
- [ ] Add bulk selection UI
- [ ] Bulk edit (change topics, difficulty, etc.)
- [ ] Bulk delete
- [ ] Bulk export

**Impact**: Efficient content management

---

### Phase 5: Advanced Features (Future)

#### 5.1 Round/Set Management
**Why**: Better organization for quiz events
**Actions**:
- [ ] Create "Quiz Event" entity
- [ ] Create "Round" entity
- [ ] Link questions to rounds/events
- [ ] Export entire quiz events

**Impact**: Professional quiz event management

#### 5.2 Content Analytics
**Why**: Understand content usage
**Actions**:
- [ ] Track question usage
- [ ] Popular questions
- [ ] Creator statistics
- [ ] Topic distribution

**Impact**: Data-driven insights

---

## 🔄 Implementation Order Recommendation

### Immediate (This Week)
1. **Remove `title` requirement** - Quick win, aligns with analysis
2. **Strengthen validation** - Ensure question + creator are required

### Short Term (Next 2 Weeks)
3. **Add `points` field** - High value, relatively simple
4. **Add `round`/`set` fields** - Important for organization
5. **Export template system** - High user value

### Medium Term (Next Month)
6. **Add `timer` field** - Nice to have
7. **Add `explanation` field** - Educational value
8. **Downloadable exports** - Professional touch

### Long Term (Future)
9. **Content editing** - When users request it
10. **Bulk operations** - When needed
11. **Advanced features** - Based on user feedback

---

## 🤔 Questions to Consider

1. **Do we need to migrate existing `title` data?**
   - Option A: Keep `title` in database but stop using it
   - Option B: Migrate `title` values to a new "sets" table
   - Option C: Just deprecate and ignore

2. **How important is backward compatibility?**
   - Should we support old import formats that use `title`?
   - Should we auto-generate `title` for old data?

3. **What's the priority for export templates?**
   - Is this blocking users?
   - Should we do this before adding new fields?

4. **Do users need content editing now?**
   - Or is import → browse → export sufficient?

---

## 📊 Success Metrics

- **Data Quality**: All questions have `question` and `creator` fields
- **User Satisfaction**: Users can import/export in their preferred formats
- **Content Organization**: Questions can be organized into rounds/sets
- **Export Flexibility**: Users can save and reuse export templates

---

## 🎯 Recommended Starting Point

**Start with Phase 1.1: Remove `title` requirement**

This is a quick win that:
- Aligns the codebase with our analysis
- Reduces confusion
- Sets the foundation for cleaner data model
- Low risk (backward compatible)

Then move to **Phase 1.2: Strengthen validation** to ensure data quality.

---

## 💡 Alternative Approach

If you want to focus on **user-facing features** first:

1. **Export template system** (Phase 3.1) - High user value
2. **Downloadable exports** (Phase 3.2) - Professional touch
3. **Add `points` field** (Phase 2.1) - Useful for scoring

Then circle back to cleanup (Phase 1) later.

---

**What would you like to tackle first?**


