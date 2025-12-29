# Content Hierarchy & Suggested Improvements

## 📊 Current Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    SET (Complete Quiz/Event)                │
│  Example: "December 2025 Pub Quiz"                          │
│  - Can contain rounds AND/OR questions directly             │
│  - Top-level organization                                   │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
    ┌────▼────┐                  ┌─────▼─────┐
    │  ROUND  │                  │ QUESTION  │
    │         │                  │ (Direct)  │
    │ Example:│                  │           │
    │ "Round  │                  │ Bonus Q's │
    │  1:     │                  │ Tiebreakers│
    │ History"│                  │           │
    └────┬────┘                  └───────────┘
         │
         │
    ┌────▼────┐
    │QUESTION │
    │         │
    │ Base    │
    │ Unit    │
    └─────────┘
```

### Current Structure:
1. **Question** (Base unit)
   - Individual trivia question
   - Contains: question text, answer, points, timer, topics, etc.

2. **Round** (Middle level)
   - Collection of questions
   - Themed grouping (e.g., "History Round", "Picture Round")

3. **Set** (Top level)
   - Complete quiz/event
   - Contains rounds and/or questions directly

---

## 🎯 Suggested Additional Hierarchy Levels

### Option 1: **Minimal Addition** (Recommended for simplicity)

```
┌─────────────────────────────────────────────────────────────┐
│                    SET (Complete Quiz/Event)                │
│  Example: "December 2025 Pub Quiz"                          │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
    ┌────▼────┐                  ┌─────▼─────┐
    │  ROUND  │                  │ QUESTION  │
    │         │                  │ (Direct)  │
    └────┬────┘                  └───────────┘
         │
         │
    ┌────▼────┐
    │QUESTION │
    │         │
    │ Base    │
    │ Unit    │
    └─────────┘
```

**No changes needed** - Current structure is clean and flexible.

---

### Option 2: **Add Collection/Library Level** (For reusability)

```
┌─────────────────────────────────────────────────────────────┐
│              COLLECTION/LIBRARY (Reusable Template)         │
│  Example: "Standard Pub Quiz Template"                        │
│  - Reusable set of rounds that can be cloned                 │
│  - Used as starting point for new quizzes                    │
└─────────────────────────────────────────────────────────────┘
         │
         │
┌────────▼─────────────────────────────────────────────────────┐
│                    SET (Complete Quiz/Event)                │
│  Example: "December 2025 Pub Quiz"                          │
│  - Created from Collection template                          │
│  - Can be customized for specific event                      │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
    ┌────▼────┐                  ┌─────▼─────┐
    │  ROUND  │                  │ QUESTION  │
    │         │                  │ (Direct)  │
    └────┬────┘                  └───────────┘
         │
         │
    ┌────▼────┐
    │QUESTION │
    └─────────┘
```

**Benefits:**
- Create reusable quiz templates
- Clone collections to create new sets quickly
- Standardize quiz formats

**Use Case:** "I want to use the same 5 rounds for every monthly quiz, but customize questions"

---

### Option 3: **Add Series Level** (For multi-event organization)

```
┌─────────────────────────────────────────────────────────────┐
│                    SERIES (Ongoing Series)                   │
│  Example: "2025 Monthly Pub Quiz Series"                     │
│  - Groups multiple related sets/events                       │
│  - Tracks progress over time                                 │
└─────────────────────────────────────────────────────────────┘
         │
         │
┌────────▼─────────────────────────────────────────────────────┐
│                    SET (Complete Quiz/Event)                │
│  Example: "December 2025 Pub Quiz"                          │
│  - One event in the series                                   │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
    ┌────▼────┐                  ┌─────▼─────┐
    │  ROUND  │                  │ QUESTION  │
    │         │                  │ (Direct)  │
    └────┬────┘                  └───────────┘
         │
         │
    ┌────▼────┐
    │QUESTION │
    └─────────┘
```

**Benefits:**
- Organize related events (monthly quizzes, tournament rounds)
- Track series-wide statistics
- Link related sets together

**Use Case:** "I run a monthly quiz - I want to see all 12 monthly quizzes together"

---

### Option 4: **Add Category/Topic Group Level** (For better organization)

```
┌─────────────────────────────────────────────────────────────┐
│                    SET (Complete Quiz/Event)                │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
    ┌────▼────┐                  ┌─────▼─────┐
    │  ROUND  │                  │ QUESTION  │
    │         │                  │ (Direct)  │
    └────┬────┘                  └───────────┘
         │
         │
    ┌────▼────┐
    │QUESTION │
    │         │
    │ Tags:   │
    │ - Topic │
    │ - Category│
    │ - Difficulty│
    └─────────┘
```

**Note:** Topics already exist as tags on questions. This is already implemented!

---

### Option 5: **Full Hierarchy** (Most comprehensive)

```
┌─────────────────────────────────────────────────────────────┐
│                    SERIES (Ongoing Series)                   │
│  Example: "2025 Monthly Pub Quiz Series"                     │
└─────────────────────────────────────────────────────────────┘
         │
         │
┌────────▼─────────────────────────────────────────────────────┐
│              COLLECTION/LIBRARY (Reusable Template)         │
│  Example: "Standard Pub Quiz Template"                        │
└─────────────────────────────────────────────────────────────┘
         │
         │ (cloned from)
         │
┌────────▼─────────────────────────────────────────────────────┐
│                    SET (Complete Quiz/Event)                │
│  Example: "December 2025 Pub Quiz"                          │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
    ┌────▼────┐                  ┌─────▼─────┐
    │  ROUND  │                  │ QUESTION  │
    │         │                  │ (Direct)  │
    └────┬────┘                  └───────────┘
         │
         │
    ┌────▼────┐
    │QUESTION │
    │         │
    │ Topics: │
    │ - History│
    │ - Sports │
    │ - etc.   │
    └─────────┘
```

---

## 💡 **Recommendations**

### ✅ **Keep Current Structure** (Recommended)
The current 3-level hierarchy (Question → Round → Set) is:
- ✅ Simple and intuitive
- ✅ Flexible enough for most use cases
- ✅ Easy to understand
- ✅ Already implemented and working

### 🎯 **Optional Enhancements** (If needed later)

#### 1. **Series** (Low priority)
**What:** Group multiple sets together  
**Use Case:** "I run monthly quizzes and want to see them all together"  
**Implementation:** Add `series_id` to sets table, create `series` table  
**Priority:** Low - Can be achieved with naming conventions or tags

#### 2. **Collections/Templates** (Medium priority)
**What:** Reusable quiz templates that can be cloned  
**Use Case:** "I use the same round structure every month, but different questions"  
**Implementation:** Add `template_id` to sets, create `templates` table  
**Priority:** Medium - Useful for recurring quiz formats

#### 3. **Question Pools** (Low priority)
**What:** Pre-organized groups of questions by topic/difficulty  
**Use Case:** "I want to randomly select 10 questions from my History pool"  
**Implementation:** Could use tags/topics filtering (already exists)  
**Priority:** Low - Current topic system works well

#### 4. **Tournaments** (Low priority)
**What:** Multi-round competitions with scoring  
**Use Case:** "I'm running a tournament with multiple quiz nights"  
**Implementation:** Series + scoring system  
**Priority:** Low - Can use Series if needed

---

## 📋 **Current Hierarchy Details**

### Level 1: **Question** (Base Unit)
```
Question
├── Question Text (required)
├── Answer
├── Points
├── Timer
├── Topics (array)
├── Difficulty
├── Explanation
├── Notes
├── Alternate Answers
├── Source (URL)
└── Media Files
```

**Relationships:**
- Can belong to multiple Rounds
- Can belong to multiple Sets
- Standalone (not in any round/set)

---

### Level 2: **Round** (Middle Level)
```
Round
├── Name (required)
├── Creator
├── Date
├── Description
├── Topics (array)
└── Questions (via junction table)
    └── Sequence order
```

**Relationships:**
- Contains multiple Questions
- Can belong to multiple Sets
- Questions ordered by sequence

**Example:**
- "Round 1: World History" → 10 questions
- "Picture Round" → 5 image questions

---

### Level 3: **Set** (Top Level)
```
Set
├── Name (required)
├── Creator
├── Date
├── Description
├── Topics (array)
├── Rounds (via junction table)
│   └── Sequence order
└── Questions (via junction table, direct)
    └── Sequence order
```

**Relationships:**
- Contains multiple Rounds
- Contains multiple Questions (directly)
- Can contain both rounds and questions
- Everything ordered by sequence

**Example:**
- "December 2025 Pub Quiz"
  - Round 1: History (10 questions)
  - Round 2: Sports (10 questions)
  - Bonus Question (directly in set)

---

## 🔄 **Current Flexibility**

The current system already supports:

✅ **Many-to-Many Relationships:**
- Questions ↔ Rounds (question can be in multiple rounds)
- Questions ↔ Sets (question can be in multiple sets)
- Rounds ↔ Sets (round can be in multiple sets)

✅ **Flexible Organization:**
- Questions can be standalone
- Questions can be in rounds
- Questions can be directly in sets
- Rounds can be in sets
- Sets can have both rounds and questions

✅ **Topic/Category System:**
- Questions have topics (array)
- Rounds have topics (array)
- Sets have topics (array)
- Can filter/browse by topics

---

## 🎯 **Final Recommendation**

### **Keep Current Structure** ✅

The current 3-level hierarchy is:
- **Simple** - Easy to understand
- **Flexible** - Handles all common use cases
- **Scalable** - Can grow as needed
- **Intuitive** - Matches how people think about quizzes

### **Future Enhancements** (If needed):

1. **Series** - Only if you need to group multiple sets together regularly
2. **Templates/Collections** - Only if you frequently clone quiz structures
3. **Question Pools** - Already handled by topics/tags

### **What's Already Great:**

✅ Topics system provides categorization  
✅ Many-to-many relationships provide flexibility  
✅ Sequence ordering provides control  
✅ Direct questions in sets provides flexibility  

---

## 📊 **Visual Summary**

```
Current Hierarchy (Recommended):
┌─────────────┐
│    SET      │ ← Complete Quiz/Event
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──────┐
│ROUND│ │QUESTION │ ← Can be direct in set
└──┬──┘ └─────────┘
   │
┌──▼──┐
│QUESTION│ ← Base unit
└───────┘
```

**This structure handles:**
- ✅ Single questions
- ✅ Themed rounds
- ✅ Complete quizzes
- ✅ Reusable rounds
- ✅ Flexible organization

**No additional levels needed for most use cases!**

