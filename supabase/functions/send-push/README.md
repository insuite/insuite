# send-push Edge Function

Triggered by Supabase Database Webhooks to deliver push notifications via Expo
Push API.

## Deploy

```powershell
# 1. Install + login (one-time)
npx supabase login
npx supabase link --project-ref <your-project-ref>

# 2. Set webhook secret (any long random string — used to authenticate
#    incoming webhook calls)
npx supabase secrets set WEBHOOK_SECRET="<long-random-string>"

# 3. Deploy
npx supabase functions deploy send-push --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase —
no need to set them manually.

The `--no-verify-jwt` flag is important: webhooks don't carry user JWTs, they
authenticate via the WEBHOOK_SECRET header instead.

## Configure Database Webhooks

Supabase Dashboard → **Database → Webhooks** → **Create a new hook** → repeat
3 times with these settings:

| Hook name | Table | Events | URL |
|---|---|---|---|
| push_on_message | messages | Insert | `https://<ref>.supabase.co/functions/v1/send-push` |
| push_on_join_request | join_requests | Insert | (same URL) |
| push_on_request_accepted | join_requests | Update | (same URL) |

For **all three**, under "HTTP Headers" add:
- Name: `Authorization`
- Value: `Bearer <your WEBHOOK_SECRET from step 2>`
- Name: `Content-Type`
- Value: `application/json`

Method: `POST`. Leave the rest at defaults.

## Test

Run a join request flow between two accounts on real devices. Check function
logs in Supabase Dashboard → **Edge Functions → send-push → Logs** to see the
incoming webhook payloads and Expo response.
