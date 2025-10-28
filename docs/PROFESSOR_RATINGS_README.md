# Professor Ratings Feature

## Overview

The Professor Ratings feature integrates with Rate My Professor (RMP) to provide real-time instructor ratings for course sections. It includes intelligent caching to minimize API calls and ensure fast response times.

## Features

- ✅ **Automatic Caching**: 24-hour cache for professor ratings
- ✅ **Graceful Fallback**: Returns "No rating available" for unrated professors
- ✅ **Secure API Management**: API keys stored in environment variables
- ✅ **MongoDB-backed Cache**: Persistent storage for rating data
- ✅ **Error Handling**: Comprehensive logging and error recovery

## Architecture

### Components

1. **ProfessorRatingsConcept** (`src/concepts/ProfessorRatings/professorRatingsConcept.ts`)
   - Main business logic
   - Cache management
   - RMP API integration

2. **MongoDB Collection**: `professorRatings`
   - Stores cached rating data
   - Indexed by `instructorName`

3. **API Endpoint**: `POST /api/ProfessorRatings/getRatingForSection`
   - Input: `{ sectionId: string }`
   - Output: Professor rating data with caching info

## Environment Variables

Add these to your `.env` file:

```bash
# Rate My Professor API Configuration
RMP_API_BASE_URL=https://www.ratemyprofessors.com/graphql
RMP_SCHOOL_ID=1506  # Wellesley College (update for your institution)
RMP_API_KEY=        # Optional: API key if required (leave empty for public access)
```

### Finding Your School ID

1. Go to Rate My Professor website
2. Search for your school
3. The URL will be like: `https://www.ratemyprofessors.com/school/1506`
4. The number (1506) is your school ID

## API Endpoints

### Get Professor Rating for Section

**Endpoint**: `POST /api/ProfessorRatings/getRatingForSection`

**Request Body**:
```json
{
  "sectionId": "019a1dd5-2307-75e6-87a9-c67b9784e447"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "instructorName": "Kellie Cherie Carter Jackson",
    "schoolName": "Wellesley College",
    "rating": 4.8,
    "difficulty": 2.1,
    "numRatings": 56,
    "wouldTakeAgainPercent": 95.5,
    "rmpId": "123456",
    "lastUpdated": "2025-10-26T12:00:00.000Z"
  }
}
```

**No Rating Available** (200 OK):
```json
{
  "success": true,
  "data": {
    "instructorName": "New Professor Name",
    "rating": null,
    "difficulty": null,
    "numRatings": 0,
    "wouldTakeAgainPercent": null,
    "lastUpdated": "2025-10-26T12:00:00.000Z"
  }
}
```

**Error Response** (200 OK with error message):
```json
{
  "success": false,
  "message": "Section not found"
}
```

### Refresh Rating

**Endpoint**: `POST /api/ProfessorRatings/refreshRating`

Force refresh a professor's rating (bypasses cache):

**Request Body**:
```json
{
  "instructorName": "Kellie Cherie Carter Jackson"
}
```

### Get All Cached Ratings (Admin)

**Endpoint**: `POST /api/ProfessorRatings/getAllCachedRatings`

**Request Body**: `{}`

Returns all cached ratings for debugging/admin purposes.

### Clear Cache (Admin)

**Endpoint**: `POST /api/ProfessorRatings/clearCache`

**Request Body**: `{}`

Clears all cached ratings.

## Frontend Integration

### Example: Fetching Rating When Section is Clicked

```typescript
// When a section is clicked in the schedule builder
async function handleSectionClick(sectionId: string) {
  try {
    const response = await fetch('/api/ProfessorRatings/getRatingForSection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sectionId }),
    });

    const result = await response.json();

    if (result.success && result.data) {
      displayProfessorRating(result.data);
    } else {
      displayNoRating(result.message || 'No rating available');
    }
  } catch (error) {
    console.error('Error fetching professor rating:', error);
    displayError('Unable to load professor rating');
  }
}

function displayProfessorRating(rating) {
  if (rating.rating === null) {
    return `
      <div class="professor-rating">
        <p><strong>${rating.instructorName}</strong></p>
        <p class="no-rating">No rating available on Rate My Professor</p>
      </div>
    `;
  }

  return `
    <div class="professor-rating">
      <p><strong>${rating.instructorName}</strong></p>
      <div class="rating-details">
        <p>⭐ Rating: ${rating.rating.toFixed(1)}/5.0</p>
        <p>📊 Difficulty: ${rating.difficulty.toFixed(1)}/5.0</p>
        <p>👥 Based on ${rating.numRatings} ratings</p>
        ${rating.wouldTakeAgainPercent 
          ? `<p>✅ Would take again: ${rating.wouldTakeAgainPercent.toFixed(0)}%</p>` 
          : ''}
      </div>
      <p class="cache-info">Last updated: ${new Date(rating.lastUpdated).toLocaleDateString()}</p>
    </div>
  `;
}
```

### React/TypeScript Example

```typescript
interface ProfessorRating {
  instructorName: string;
  schoolName?: string;
  rating: number | null;
  difficulty: number | null;
  numRatings: number;
  wouldTakeAgainPercent: number | null;
  lastUpdated: string;
  rmpId?: string;
}

function ProfessorRatingDisplay({ sectionId }: { sectionId: string }) {
  const [rating, setRating] = useState<ProfessorRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRating() {
      try {
        const response = await fetch('/api/ProfessorRatings/getRatingForSection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionId }),
        });

        const result = await response.json();
        
        if (result.success) {
          setRating(result.data);
        } else {
          setError(result.message || 'Failed to load rating');
        }
      } catch (err) {
        setError('Unable to load professor rating');
      } finally {
        setLoading(false);
      }
    }

    fetchRating();
  }, [sectionId]);

  if (loading) return <div>Loading rating...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!rating || rating.rating === null) {
    return (
      <div className="professor-rating">
        <p><strong>{rating?.instructorName}</strong></p>
        <p className="no-rating">No rating available</p>
      </div>
    );
  }

  return (
    <div className="professor-rating">
      <h3>{rating.instructorName}</h3>
      <div className="rating-stats">
        <div className="stat">
          <span className="label">Rating:</span>
          <span className="value">{rating.rating.toFixed(1)}/5.0 ⭐</span>
        </div>
        <div className="stat">
          <span className="label">Difficulty:</span>
          <span className="value">{rating.difficulty?.toFixed(1)}/5.0 📊</span>
        </div>
        <div className="stat">
          <span className="label">Ratings:</span>
          <span className="value">{rating.numRatings} reviews</span>
        </div>
        {rating.wouldTakeAgainPercent && (
          <div className="stat">
            <span className="label">Would take again:</span>
            <span className="value">{rating.wouldTakeAgainPercent.toFixed(0)}% ✅</span>
          </div>
        )}
      </div>
      <p className="cache-info">
        Updated: {new Date(rating.lastUpdated).toLocaleDateString()}
      </p>
    </div>
  );
}
```

## Caching Strategy

### How It Works

1. **First Request**: 
   - Checks MongoDB cache
   - Cache miss → Fetches from RMP API
   - Stores result in cache with timestamp
   - Returns data

2. **Subsequent Requests (< 24 hours)**:
   - Checks MongoDB cache
   - Cache hit + valid → Returns cached data
   - No external API call

3. **Expired Cache (> 24 hours)**:
   - Checks MongoDB cache
   - Cache hit but expired → Fetches fresh data from RMP API
   - Updates cache with new timestamp
   - Returns fresh data

### Benefits

- **Reduced API Calls**: Saves bandwidth and improves response times
- **Rate Limit Friendly**: Prevents hitting RMP API rate limits
- **Offline Resilience**: Can serve stale data if RMP API is down
- **Cost Effective**: Minimizes external API usage

### Cache Invalidation

You can manually refresh ratings using the `refreshRating` endpoint:

```bash
curl -X POST http://localhost:8000/api/ProfessorRatings/refreshRating \
  -H "Content-Type: application/json" \
  -d '{"instructorName": "Kellie Cherie Carter Jackson"}'
```

## Troubleshooting

### Common Issues

1. **"No rating available" for all professors**
   - Check that `RMP_SCHOOL_ID` is correctly set
   - Verify internet connection
   - Check RMP API is accessible

2. **Ratings not updating**
   - Cache is working correctly (24-hour expiration)
   - Use `refreshRating` endpoint to force update
   - Or wait for cache expiration

3. **Slow initial requests**
   - First request hits RMP API (slower)
   - Subsequent requests use cache (faster)
   - This is expected behavior

4. **API errors in logs**
   - RMP API might be down or rate-limiting
   - Check network connectivity
   - Review error messages in console logs

### Debugging

Enable detailed logging by checking console output:

```bash
# Check logs when running the server
deno task concepts

# Look for lines like:
# "Using cached rating for [Name]"
# "Fetching fresh rating for [Name]"
# "No RMP data found for [Name]"
```

### Testing

```bash
# Test the endpoint
curl -X POST http://localhost:8000/api/ProfessorRatings/getRatingForSection \
  -H "Content-Type: application/json" \
  -d '{"sectionId": "YOUR_SECTION_ID"}'

# View cache
curl -X POST http://localhost:8000/api/ProfessorRatings/getAllCachedRatings \
  -H "Content-Type: application/json" \
  -d '{}'

# Clear cache (for testing)
curl -X POST http://localhost:8000/api/ProfessorRatings/clearCache \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Performance Considerations

- **Cache Hit Ratio**: Expect >90% cache hits for active semesters
- **Response Time**: 
  - Cache hit: ~10-50ms
  - Cache miss: ~500-2000ms (depends on RMP API)
- **Storage**: ~1KB per cached professor rating
- **Scalability**: Handles thousands of professors efficiently

## Security

- ✅ API keys stored in environment variables (never committed)
- ✅ No direct frontend-to-RMP communication
- ✅ Rate limiting friendly (24-hour cache)
- ✅ Input validation on all endpoints
- ✅ Error messages don't expose internal details

## Future Enhancements

Potential improvements:

- [ ] Add professor photos from RMP
- [ ] Cache popular search terms
- [ ] Aggregate department ratings
- [ ] Weekly email updates for rating changes
- [ ] Integration with course evaluation data
- [ ] Predictive pre-caching for upcoming semesters

## Support

For issues or questions:
1. Check this documentation
2. Review console logs for errors
3. Test with the debugging endpoints
4. Verify environment variables are set correctly


