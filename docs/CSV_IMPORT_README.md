# CSV Import Functionality

This document describes how to use the CSV import functionality to load course section data into MongoDB.

## Overview

The CSV import system allows you to import course section data from CSV files into MongoDB. It automatically handles:
- Parsing CSV files with proper handling of quoted fields
- Converting meeting times to structured format
- Creating course records if they don't exist
- Skipping duplicate sections based on course code and section number
- Providing detailed import results and error reporting

## Features

- ✅ **CSV Parsing**: Handles quoted fields and commas properly
- ✅ **Duplicate Prevention**: Skips existing sections based on (course_code, section)
- ✅ **Course Creation**: Automatically creates course records
- ✅ **Time Parsing**: Converts meeting times to structured format
- ✅ **Error Handling**: Detailed error reporting for failed rows
- ✅ **Search & Query**: Full search capabilities for imported sections
- ✅ **API Endpoints**: RESTful API for all operations

## CSV Format

The CSV file should have the following columns:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `course_code` | string | Yes | Course identifier (e.g., "AFR 105") |
| `section` | string | Yes | Section number (e.g., "01") |
| `title` | string | Yes | Course title |
| `professor` | string | Yes | Instructor name |
| `meeting_time` | string | Yes | Meeting time (e.g., "T - 12:45 PM - 3:25 PM") |
| `current_enrollment` | number | Yes | Current number of enrolled students |
| `seats_available` | number | Yes | Number of available seats |
| `seats_total` | number | Yes | Total number of seats |
| `distribution` | string | Yes | Distribution requirements (e.g., "HS, SBA") |

### Meeting Time Format

The system supports various meeting time formats:
- `T - 12:45 PM - 3:25 PM` (Single day)
- `MR - 11:20 AM - 12:35 PM` (Multiple days)
- `MWF - 10:00 AM - 10:50 AM` (Multiple days)

Day abbreviations:
- `M` = Monday
- `T` = Tuesday  
- `W` = Wednesday
- `R` = Thursday
- `F` = Friday

## Usage

### 1. Standalone Script

Import sections using the standalone script:

```bash
# Basic usage
deno run --allow-read --allow-env --allow-net scripts/import_sections.ts data/sections.csv

# With sample data
deno run --allow-read --allow-env --allow-net scripts/import_sections.ts data/sample_sections.csv
```

### 2. API Endpoints

Once the server is running, you can use these endpoints:

#### Import Sections
```http
POST /api/CSVImport/importSectionsFromCSV
Content-Type: application/json

{
  "filePath": "data/sections.csv"
}
```

#### Get All Sections
```http
POST /api/CSVImport/getAllSections
Content-Type: application/json

{}
```

#### Search Sections
```http
POST /api/CSVImport/searchSections
Content-Type: application/json

{
  "courseCode": "AFR",
  "professor": "Professor Name",
  "title": "Introduction",
  "distribution": "SBA"
}
```

#### Get Sections by Course
```http
POST /api/CSVImport/getSectionsByCourse
Content-Type: application/json

{
  "courseCode": "AFR 105"
}
```

#### Clear All Sections
```http
POST /api/CSVImport/clearAllSections
Content-Type: application/json

{}
```

## Setup

### 1. Environment Variables

Make sure your `.env` file contains:

```env
MONGODB_URL=mongodb://localhost:27017
DB_NAME=academica
```

### 2. Start the Server

```bash
deno task concepts
```

### 3. Import Data

```bash
# Using the standalone script
deno run --allow-read --allow-env --allow-net scripts/import_sections.ts data/sample_sections.csv
```

## Example CSV File

```csv
course_code,section,title,professor,meeting_time,current_enrollment,seats_available,seats_total,distribution
AFR 105,01,Introduction to the Black Experience,Kellie Cherie Carter Jackson,T - 12:45 PM - 3:25 PM,16,14,30,"HS, SBA"
AFR 212,01,Black Women Writers,Fiona Maurissette,MR - 11:20 AM - 12:35 PM,22,3,25,"HS, SBA"
CS 101,01,Introduction to Computer Science,Dr. John Smith,MWF - 10:00 AM - 10:50 AM,30,0,30,"SBA"
```

## Import Results

The import process provides detailed results:

```json
{
  "success": true,
  "message": "✅ Loaded 120 course sections into MongoDB. Skipped 5 duplicates. 2 errors.",
  "importedCount": 120,
  "skippedCount": 5,
  "errorCount": 2,
  "errors": [
    "Skipping row: missing required fields (course_code, section, title)",
    "Error processing row: Invalid time format"
  ]
}
```

## Error Handling

The system handles various error scenarios:

- **Missing Required Fields**: Skips rows with missing course_code, section, or title
- **Invalid Time Format**: Reports errors for unparseable meeting times
- **Duplicate Sections**: Skips existing sections based on course_code + section
- **Database Errors**: Reports connection and insertion errors
- **File Errors**: Reports file reading and parsing errors

## Testing

Run the test suite:

```bash
deno test --allow-read --allow-env --allow-net src/concepts/CSVImport/
```

## Database Schema

### Sections Collection

```typescript
interface SectionDocument {
  id: string;                    // Unique identifier
  course_code: string;           // Course identifier
  section: string;               // Section number
  title: string;                 // Course title
  professor: string;             // Instructor name
  meeting_time: string;          // Original meeting time string
  current_enrollment: number;    // Current enrollment
  seats_available: number;       // Available seats
  seats_total: number;           // Total seats
  distribution: string;          // Distribution requirements
  created_at: Date;              // Creation timestamp
  updated_at: Date;              // Last update timestamp
}
```

### Courses Collection

```typescript
interface Course {
  id: string;                    // Course identifier (same as course_code)
  title: string;                 // Course title
  department: string;            // Department (extracted from course_code)
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure to use the correct Deno permissions
   ```bash
   deno run --allow-read --allow-env --allow-net scripts/import_sections.ts data/sections.csv
   ```

2. **MongoDB Connection Failed**: Check your MongoDB URL and ensure MongoDB is running
   ```env
   MONGODB_URL=mongodb://localhost:27017
   ```

3. **File Not Found**: Ensure the CSV file path is correct and the file exists

4. **CSV Format Issues**: Check that your CSV has the correct headers and format

### Debug Mode

For detailed logging, you can modify the script to include more verbose output or check the server logs when using API endpoints.

## Integration with Course Scheduling

The imported sections can be used with the existing Course Scheduling concept:

1. Import sections using CSV import
2. Use the Course Scheduling API to create schedules
3. Add sections to schedules using section IDs
4. Query and manage schedules as needed

The section IDs from the CSV import are compatible with the Course Scheduling system.


