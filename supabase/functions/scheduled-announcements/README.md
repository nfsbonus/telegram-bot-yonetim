# Scheduled Announcements Function

This Edge Function processes scheduled announcements that are due to be sent. It is designed to be called on a schedule (e.g., every 5 minutes) to check for any announcements that have reached their scheduled send time.

## Function Details

The function performs the following operations:

1. Queries the database for announcements with status 'scheduled' and a scheduled_time that is less than or equal to the current time
2. For each announcement found:
   - Retrieves the bot token
   - Gets all active subscribers for the bot
   - Sends the announcement message to each subscriber (with rate limiting)
   - Updates the announcement status to 'sent' or 'failed'
   - Tracks delivery statistics

## Deployment

Deploy this function to your Supabase project:

```bash
supabase functions deploy scheduled-announcements
```

## Setting Up a Schedule

To have this function run automatically, you'll need to set up a scheduled task that calls this function. You can use a service like GitHub Actions, AWS Lambda, or any other cron job service.

Example GitHub Action workflow:

```yaml
name: Process Scheduled Announcements

on:
  schedule:
    - cron: '*/5 * * * *'  # Run every 5 minutes

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call Scheduled Announcements Function
        run: |
          curl -X POST "https://YOUR_SUPABASE_URL/functions/v1/scheduled-announcements" \
          -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

## Manual Invocation

You can also manually invoke the function to process announcements:

```bash
curl -X POST "https://YOUR_SUPABASE_URL/functions/v1/scheduled-announcements" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

## Monitoring

Check the Supabase logs for any errors or issues with the function execution. 