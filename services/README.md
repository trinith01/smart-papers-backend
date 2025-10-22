# Paper Scheduler Service

This service automatically triggers paper statistics building and rank calculations one minute after each paper's end time.

## How It Works

1. **Automatic Scheduling**: The scheduler runs every minute to check for papers that need to be scheduled.

2. **Paper End Time Detection**: For each paper, it looks at the `availability` array in the Paper model, which contains `startTime` and `endTime` for each institute.

3. **Automatic Execution**: One minute after a paper's `endTime`, the scheduler automatically:
   - Builds paper statistics using `buildPaperStats` controller
   - Calculates rankings using `calculateRanks` controller

4. **Cleanup**: After execution, scheduled jobs are automatically cleaned up to prevent memory leaks.

## API Endpoints

### Get Scheduler Status
```
GET /api/scheduler/status
```
Returns information about currently scheduled jobs and scheduler status.

### Manual Trigger Processing
```
POST /api/scheduler/manual-trigger/{paperId}
```
Manually trigger stats building and rank calculation for a specific paper.

### Cancel Scheduled Job
```
DELETE /api/scheduler/cancel/{scheduleKey}
```
Cancel a specific scheduled job using its schedule key.

### Restart Scheduler
```
POST /api/scheduler/restart
```
Restart the entire scheduler service (useful for development/troubleshooting).

## Example Usage

### Check scheduler status:
```bash
curl http://localhost:5000/api/scheduler/status
```

### Manually trigger processing for a paper:
```bash
curl -X POST http://localhost:5000/api/scheduler/manual-trigger/60f7b3b3b3b3b3b3b3b3b3b3
```

### Cancel a scheduled job:
```bash
curl -X DELETE http://localhost:5000/api/scheduler/cancel/60f7b3b3b3b3b3b3b3b3b3b3_60f7b3b3b3b3b3b3b3b3b3b4
```

## Logging

The scheduler provides detailed console logging:
- `📅` Scheduling events
- `🔄` Processing start
- `📊` Stats building
- `🏆` Rank calculation
- `✅` Success messages
- `❌` Error messages
- `🧹` Cleanup operations

## Dependencies

- `node-cron`: For scheduling jobs
- `mongoose`: For database operations

## Paper Model Requirements

The Paper model must have an `availability` array with objects containing:
```javascript
{
  institute: ObjectId,  // Institute reference
  startTime: Date,      // When the paper becomes available
  endTime: Date         // When the paper ends (triggers processing 1 minute later)
}
```

## Automatic Initialization

The scheduler automatically initializes when the server starts and begins checking for papers that need scheduling.

## Error Handling

- Failed operations are logged but don't crash the scheduler
- Jobs are automatically cleaned up even if they fail
- The scheduler continues running even if individual paper processing fails