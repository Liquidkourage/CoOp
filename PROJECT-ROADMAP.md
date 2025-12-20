# Trivia Content Repository - Project Roadmap & Questions

## Vision Statement
**Goal**: A comprehensive, flexible repository where CoOp members can import and export trivia content in their preferred formats, with extensible import/export capabilities.

## Current State Assessment

### ✅ What's Working
- **Database**: PostgreSQL integration with file-system fallback
- **Basic Import**: CSV (TrivNow) and Excel (.xlsx) import with user-specific configurations
- **Basic Export**: 8+ display/export modes (Q&A pairs, quiz format, spreadsheet, etc.)
- **User System**: Basic user context (localStorage-based, no auth yet)
- **Content Display**: Multiple view modes for browsing/searching
- **File Handling**: Upload and serve associated files

### ⚠️ What Needs Work
- **Import Extensibility**: Currently hardcoded for CSV/Excel, needs plugin system
- **Export Extensibility**: Display modes are hardcoded, need template system
- **Field Structure**: Some fields redundant, some missing (see DATA-FIELDS-ANALYSIS.md)
- **Authentication**: Basic user system exists but no real auth
- **Round-trip**: Import → Export → Import may not preserve all data

---

## Critical Questions for "Finished" Definition

### 1. Import Extensibility
**Current**: Users configure column mappings for CSV/Excel in localStorage

**Questions**:
- Should users be able to create/share import configurations?
- Do we need to support other formats (JSON, XML, Google Sheets, etc.)?
- Should import be "teachable" - i.e., learn from examples?
- Do we need import validation/error handling beyond current?
- Should imports support batch operations (multiple files at once)?

**Proposed Solution**:
- Plugin-based import system
- Each user can save/share import configurations
- Support for common formats out-of-box
- Custom format handlers via configuration

### 2. Export Extensibility
**Current**: 8 hardcoded export modes

**Questions**:
- Should users be able to create custom export templates?
- Do we need export to match import format (round-trip)?
- Should exports be downloadable files or just copy-paste?
- Do we need scheduled/exports (email, API webhooks)?
- What formats are most critical for CoOp members?

**Proposed Solution**:
- Template-based export system
- Users can save/share export templates
- Support for common formats (CSV, Excel, JSON, PDF, etc.)
- Custom templates via UI builder

### 3. Data Model Completeness
**Current**: See DATA-FIELDS-ANALYSIS.md

**Questions**:
- Are current fields sufficient for all CoOp members' needs?
- Do we need structured `options` array for multiple-choice?
- Should we support custom/user-defined fields?
- Do we need explicit "set" or "round" grouping?
- What media types are essential?

**Proposed Solution**:
- Add structured `options` field
- Support custom fields via JSON metadata
- Explicit grouping fields (`set`, `round`, `points`, etc.)
- Media type detection and handling

### 4. User System & Permissions
**Current**: Basic user context, no authentication

**Questions**:
- Do users need to see only their own content, or all content?
- Should users be able to edit/delete others' content?
- Do we need roles (admin, creator, viewer)?
- Should configurations be private or shareable?
- Do we need user profiles/preferences?

**Proposed Solution** (for now):
- All users see all content (CoOp is collaborative)
- Users can only delete their own content
- Configurations are user-specific but can be shared
- No roles needed initially

### 5. Workflow & UX
**Current**: Import → Browse → Export

**Questions**:
- What's the typical workflow for CoOp members?
- Do they need to edit questions after import?
- Do they need to organize into sets/rounds?
- Should there be a "draft" vs "published" workflow?
- Do we need search/filter improvements?

**Proposed Solution**:
- Streamline import → review → export flow
- Add basic editing capability
- Support set/round organization
- Keep it simple - no complex workflows initially

---

## Roadmap to "Finished"

### Phase 1: Data Model Refinement ✅ (Mostly Done)
- [x] Rename `description` → `question`
- [x] Remove `format` field
- [ ] Add structured `options` array
- [ ] Add `set`/`round` fields if needed
- [ ] Document all fields clearly

### Phase 2: Import Extensibility (In Progress)
- [x] User-specific import configurations
- [x] CSV and Excel support
- [ ] Import configuration sharing
- [ ] Additional format support (JSON, etc.)
- [ ] Import validation/error handling
- [ ] Batch import support

### Phase 3: Export Extensibility (Partially Done)
- [x] Multiple export display modes
- [x] Copy-to-clipboard functionality
- [ ] Export template system
- [ ] Downloadable file exports (CSV, Excel, PDF)
- [ ] Custom export templates
- [ ] Round-trip compatibility

### Phase 4: User Experience (In Progress)
- [x] User selector/context
- [x] User-specific configurations
- [ ] Content editing
- [ ] Set/round organization
- [ ] Improved search/filter
- [ ] Better error messages

### Phase 5: Polish & Documentation (Not Started)
- [ ] User documentation
- [ ] Configuration guides
- [ ] API documentation
- [ ] Deployment guide updates
- [ ] Example files/templates

---

## Immediate Next Steps

### Priority 1: Understand Requirements
1. **Survey CoOp members**: What formats do they use? What do they need?
2. **Test current system**: Import real files, export in various formats
3. **Identify gaps**: What's missing for "finished"?

### Priority 2: Fix Critical Issues
1. **Structured options**: Add `options` array for multiple-choice questions
2. **Export downloads**: Add file download capability (not just copy-paste)
3. **Import validation**: Better error messages and validation

### Priority 3: Extensibility Foundation
1. **Template system**: Design export template structure
2. **Plugin architecture**: Design import plugin system
3. **Configuration sharing**: Allow users to share configs

---

## Success Criteria for "Finished"

### Must Have:
- ✅ Users can import content in their preferred format (CSV/Excel at minimum)
- ✅ Users can export content in useful formats (copy-paste + downloads)
- ✅ User-specific import configurations work
- ✅ Content is searchable and filterable
- ✅ Multiple display/export modes available

### Should Have:
- ⏳ Export templates are customizable
- ⏳ Additional import formats supported
- ⏳ Structured data fields (options array, etc.)
- ⏳ Better error handling and validation
- ⏳ Content editing capability

### Nice to Have:
- ⏳ Round-trip import/export compatibility
- ⏳ Configuration sharing between users
- ⏳ Scheduled exports/webhooks
- ⏳ Advanced search/filtering
- ⏳ User authentication (if needed)

---

## Questions for You

1. **What formats do CoOp members actually use?** (Beyond CSV/Excel)
2. **What export formats are most important?** (Copy-paste vs downloadable files)
3. **Do we need structured `options` array, or is current approach sufficient?**
4. **Should users be able to edit questions after import?**
5. **Do we need explicit "set" or "round" grouping, or is creator/date sufficient?**
6. **What's the priority order for the roadmap phases?**
7. **Are there any deal-breakers for "finished"?**

