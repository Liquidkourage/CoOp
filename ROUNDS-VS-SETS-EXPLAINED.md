# Rounds vs Sets - Explained

## Quick Answer

**Round** = A collection of questions (like "Round 1: History", "Round 2: Sports")  
**Set** = A complete quiz/event that contains rounds and/or questions (like "December 2025 Quiz Night")

---

## 📋 **ROUND** - A Collection of Questions

### What it is:
A **round** is a grouping of related questions. Think of it as a "section" or "category" within a quiz.

### Structure:
- Contains **questions directly**
- Questions are ordered by sequence
- Has metadata: name, creator, date, topics, description

### Examples:
- "Round 1: World History"
- "Round 2: Pop Culture"
- "Round 3: Science & Nature"
- "Picture Round: Name the Celebrity"
- "Audio Round: Name the Song"

### Use Cases:
- Organizing questions by topic or theme
- Creating themed sections within a quiz
- Grouping questions that go together
- Reusable question groups

### Key Point:
A round **only contains questions**. It's a middle-level organization structure.

---

## 📚 **SET** - A Complete Quiz/Event

### What it is:
A **set** is a complete quiz or event. It's the top-level container that brings everything together.

### Structure:
- Can contain **rounds** (which contain questions)
- Can contain **questions directly** (standalone questions)
- Can contain **both** rounds and questions
- Has metadata: name, creator, date, topics, description

### Examples:
- "December 2025 Quiz Night"
- "Summer Trivia Championship 2025"
- "Weekly Pub Quiz - Week 3"
- "Corporate Team Building Quiz"

### Use Cases:
- Creating a complete quiz for a specific event
- Organizing multiple rounds into one quiz
- Including bonus questions outside of rounds
- Reusing rounds across different sets/events

### Key Point:
A set is the **complete quiz**. It can include rounds, individual questions, or both.

---

## 🔄 **Relationships**

### The Hierarchy:
```
Set (Complete Quiz)
├── Round 1: History
│   ├── Question 1
│   ├── Question 2
│   └── Question 3
├── Round 2: Sports
│   ├── Question 4
│   └── Question 5
└── Bonus Question (directly in set, not in a round)
```

### Many-to-Many Relationships:

**Questions ↔ Rounds:**
- A question can belong to multiple rounds
- A round contains multiple questions
- Example: "What is the capital of France?" could be in both "Round 1: Geography" and "Round 2: European Capitals"

**Questions ↔ Sets:**
- A question can belong to multiple sets
- A set can contain multiple questions
- Example: A bonus question could appear in multiple quiz events

**Rounds ↔ Sets:**
- A round can belong to multiple sets
- A set can contain multiple rounds
- Example: "Round 1: History" could be reused in "December Quiz" and "January Quiz"

---

## 📊 **Real-World Example**

### Scenario: "December 2025 Pub Quiz"

**Set:** "December 2025 Pub Quiz"

**Contains:**

1. **Round:** "Round 1: World History" (10 questions)
   - Q: "In what year did World War II end?"
   - Q: "Who was the first President of the United States?"
   - ... (8 more questions)

2. **Round:** "Round 2: Pop Culture" (10 questions)
   - Q: "What TV show features the character Walter White?"
   - Q: "Who sang 'Bohemian Rhapsody'?"
   - ... (8 more questions)

3. **Round:** "Round 3: Picture Round" (5 questions)
   - Q: [Image] "Name this celebrity"
   - ... (4 more image questions)

4. **Direct Questions in Set** (not in a round):
   - Bonus Question: "What is the capital of Ireland?"
   - Tiebreaker: "How many countries are in the European Union?"

**Result:**
- **Set** = "December 2025 Pub Quiz" (the complete event)
- **Rounds** = 3 rounds (organized sections)
- **Total Questions** = 27 questions (22 in rounds + 5 standalone)

---

## 🎯 **When to Use Each**

### Use a **ROUND** when:
- ✅ You want to group related questions together
- ✅ Questions share a common theme or topic
- ✅ You want to organize questions into sections
- ✅ You might reuse this group of questions in different quizzes
- ✅ You're creating themed sections (History Round, Sports Round, etc.)

### Use a **SET** when:
- ✅ You're creating a complete quiz for a specific event
- ✅ You want to combine multiple rounds into one quiz
- ✅ You have standalone questions that don't fit in rounds
- ✅ You're organizing a quiz night, tournament, or event
- ✅ You want to see the complete quiz structure

---

## 💡 **Key Differences Summary**

| Feature | Round | Set |
|---------|-------|-----|
| **Contains** | Questions only | Rounds + Questions |
| **Level** | Middle-level organization | Top-level organization |
| **Purpose** | Group related questions | Complete quiz/event |
| **Reusability** | Can be reused in multiple sets | Usually event-specific |
| **Example** | "Round 1: History" | "December 2025 Quiz Night" |
| **Structure** | Questions → Round | Rounds + Questions → Set |

---

## 🔍 **In the Database**

### Database Tables:
- `rounds` - Stores round metadata
- `sets` - Stores set metadata
- `question_rounds` - Links questions to rounds (many-to-many)
- `question_sets` - Links questions to sets (many-to-many)
- `round_sets` - Links rounds to sets (many-to-many)

### What This Means:
- Questions are the **base unit** - they're stored independently
- Rounds are **collections** of questions
- Sets are **collections** of rounds and/or questions
- Everything is **flexible** - questions can belong to multiple rounds/sets

---

## 🎬 **Workflow Example**

### Creating a Complete Quiz:

1. **Create Questions** (individual questions)
   - "What is the capital of France?"
   - "Who wrote Romeo and Juliet?"
   - etc.

2. **Create Rounds** (organize questions)
   - Round: "Geography" → Add 10 geography questions
   - Round: "Literature" → Add 10 literature questions
   - Round: "Picture Round" → Add 5 image questions

3. **Create Set** (combine into complete quiz)
   - Set: "January 2026 Quiz Night"
   - Add Round: "Geography"
   - Add Round: "Literature"
   - Add Round: "Picture Round"
   - Add standalone bonus questions directly to set

4. **Result:** A complete quiz ready to use!

---

## 📝 **Notes**

- **Questions are the foundation** - Everything is built from individual questions
- **Rounds organize questions** - They group related questions together
- **Sets create complete quizzes** - They combine rounds and questions into events
- **Everything is reusable** - Questions can be in multiple rounds, rounds can be in multiple sets
- **Flexible structure** - You can have questions directly in sets without rounds if needed

---

## 🤔 **Still Confused?**

Think of it like a book:
- **Question** = A sentence
- **Round** = A chapter (groups related sentences)
- **Set** = The complete book (contains chapters and maybe standalone pages)

Or like a restaurant menu:
- **Question** = An individual dish
- **Round** = A menu section (Appetizers, Entrees, Desserts)
- **Set** = The complete menu for a specific event (Wedding Menu, Holiday Menu)

