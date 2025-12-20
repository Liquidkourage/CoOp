# Date Field to Multiple-Choice Options Mapping

## Overview

You can now map date columns to multiple-choice (MC) options. This is useful when your trivia questions have dates as answer options (e.g., "When did X happen?" with date options).

## How It Works

### Mapping Date Columns to Options

1. **In Configure Import Format** (`/configure-import`):
   - Upload your file with date columns
   - Map date columns to **"Options (for multiple-choice)"**
   - Multiple date columns can be mapped to options - they'll all be collected into one options array

2. **Date Format Support**:
   - **Excel Date Serial Numbers**: Automatically converted (e.g., `45321` → `2024-01-15`)
   - **Date Strings**: Various formats supported:
     - `YYYY-MM-DD` (e.g., `2024-01-15`)
     - `MM/DD/YYYY` (e.g., `01/15/2024`)
     - `MM-DD-YYYY` (e.g., `01-15-2024`)
   - **Date Objects**: JavaScript Date objects are formatted as `YYYY-MM-DD`

3. **Multiple Date Columns**:
   - You can map multiple date columns to options
   - All dates from all mapped columns will be collected into a single `options` array
   - Duplicates are automatically removed

## Example Use Cases

### Example 1: Single Date Column as Options

**File Structure:**
```
Question,Option1,Option2,Option3,Answer
"When was the first moon landing?",1969-07-20,1968-12-24,1970-04-11,1969-07-20
```

**Mapping:**
- `Question` → `question`
- `Option1` → `options`
- `Option2` → `options`
- `Option3` → `options`
- `Answer` → `answer`

**Result:**
```json
{
  "question": "When was the first moon landing?",
  "options": ["1969-07-20", "1968-12-24", "1970-04-11"],
  "answer": "1969-07-20"
}
```

### Example 2: Excel Date Serial Numbers

**File Structure (Excel):**
```
Question,Date1,Date2,Date3,CorrectDate
"When did WW2 end?",45321,45322,45323,45321
```

**Mapping:**
- `Question` → `question`
- `Date1` → `options`
- `Date2` → `options`
- `Date3` → `options`
- `CorrectDate` → `answer`

**Result:**
```json
{
  "question": "When did WW2 end?",
  "options": ["2024-01-15", "2024-01-16", "2024-01-17"],
  "answer": "2024-01-15"
}
```

### Example 3: Mixed Date Formats

**File Structure:**
```
Question,StartDate,EndDate,CorrectDate
"When was the Berlin Wall built?",1961-08-13,08/15/1961,1961-08-13
```

**Mapping:**
- `Question` → `question`
- `StartDate` → `options`
- `EndDate` → `options`
- `CorrectDate` → `answer`

**Result:**
```json
{
  "question": "When was the Berlin Wall built?",
  "options": ["1961-08-13", "1961-08-15"],
  "answer": "1961-08-13"
}
```

## Technical Details

### Date Conversion Logic

1. **Excel Date Serial Numbers**:
   - Detected when value is a number between 25569 and 1000000
   - Converted using Excel epoch (December 30, 1899)
   - Formula: `new Date(1899-12-30) + (serialNumber - 1) * 86400 * 1000`

2. **Date Strings**:
   - Parsed using JavaScript `Date` constructor
   - Formatted as `YYYY-MM-DD` (ISO date format)

3. **Date Objects**:
   - Directly formatted using `toISOString().split('T')[0]`

### Processing Flow

1. **Collection Phase**: All columns mapped to `options` are collected
2. **Conversion Phase**: Each value is checked and converted to date string if needed
3. **Deduplication**: Duplicate dates are removed
4. **Merging**: Combined with any options from multiple-choice detection logic

## Notes

- **Date Format**: All dates are normalized to `YYYY-MM-DD` format in the options array
- **Duplicates**: Duplicate dates are automatically removed
- **Mixed Types**: You can mix date columns with regular text columns mapped to options
- **Comma-Separated**: If a single cell contains comma-separated dates, they'll be split into separate options
- **Null/Empty**: Empty or null date values are skipped

## Troubleshooting

### Dates Not Converting Properly

- Check that the date column is actually mapped to `options` (not `date`)
- Excel dates might need to be formatted as dates in Excel (not text)
- Date strings should match supported formats (`YYYY-MM-DD`, `MM/DD/YYYY`, etc.)

### Multiple Date Columns Not Combining

- Make sure all date columns are mapped to `options` (not `date`)
- Check the test mapping preview to see how dates are being converted
- Verify that dates are being collected in the options array

### Excel Date Serial Numbers Not Working

- Excel date serial numbers must be actual numbers (not text)
- Range should be between 25569 (Jan 1, 1970) and ~1000000
- Very large numbers might be timestamps, not Excel dates

