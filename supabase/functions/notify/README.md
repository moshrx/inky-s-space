# notify — email on new poem / new echo

Emails the site owner when:

- a **reader leaves an echo** (`echoes` INSERT), or
- a **poem is placed** (`poems` UPDATE where `published_at` goes `null → timestamp`)

Runs entirely on Supabase. **No Next.js app code is involved** — nothing was added
to the client bundle, and the Resend key never reaches a browser.

Autosave fires an UPDATE on `poems` on nearly every keystroke, so the function
filters hard: only the single transition into "published" sends mail. Draft
edits, post-publish edits, and un-publishing are all ignored.

---

## 1. Resend account

Already set up and live.

- **Sender:** `Inky's Space <inky@moshr.ca>` — `moshr.ca` is a verified domain
  on the Resend account, so mail can reach any recipient.
- **Recipient:** `shareef3533@gmail.com`

Verified end to end on 2026-08-13: a real `echoes` insert fired the trigger,
the function returned 200, and Resend accepted the send with no errors.

> Earlier setup used the shared `onboarding@resend.dev` sender, which can only
> deliver to the Resend signup address (`mleo10809@gmail.com`) and gets filtered
> aggressively by Gmail. Verifying `moshr.ca` removed both limits. If mail ever
> stops arriving, re-check the domain's status first — an expired or altered
> DNS record puts it back into that restricted mode.

## 2. Set the function secrets

```sh
supabase link --project-ref cnkmlqaazxozwtjfhqgb

supabase secrets set \
  RESEND_API_KEY="re_your_key_here" \
  NOTIFY_TO="shareef3533@gmail.com" \
  NOTIFY_FROM="Inky's Space <inky@moshr.ca>" \
  WEBHOOK_SECRET="$(openssl rand -hex 24)"
```

Paste the real API key in place of `re_your_key_here` when you run this. Do not
commit it — secrets live in Supabase, never in this repo, which is public.

Save the `WEBHOOK_SECRET` value — step 4 needs it. Supabase stores secrets
hashed, so it cannot be read back later; if lost, generate a new one and update
both webhook headers to match.

## 3. Deploy

```sh
supabase functions deploy notify --no-verify-jwt
```

`--no-verify-jwt` is required so Supabase's own webhook can call it. The
`x-webhook-secret` header set in step 4 is what actually guards the endpoint.

## 4. Create the two Database Webhooks

Dashboard → **Database → Webhooks → Create a new hook**.

> **Already done on this project (2026-08-13).** Both triggers exist and are
> firing. This section is kept for rebuilding from scratch.
>
> Newer dashboards have moved this page out of Database — try **Integrations**,
> or press `Cmd+K` and search "webhooks". If it cannot be found at all,
> [`sql/notify_webhooks.sql`](../../../sql/notify_webhooks.sql) creates both
> triggers directly and is what was actually used here.

**Hook 1 — echoes**

| field | value |
|---|---|
| Name | `notify_echo` |
| Table | `echoes` |
| Events | `Insert` only |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://cnkmlqaazxozwtjfhqgb.supabase.co/functions/v1/notify` |
| HTTP Headers | `x-webhook-secret` = *(the value above)* |

**Hook 2 — poems**

Identical, except:

| field | value |
|---|---|
| Name | `notify_poem` |
| Table | `poems` |
| Events | `Update` only |

> Leave `Insert` **off** for `poems`. A new poem is always created as a draft,
> so an insert is never a publish.

## 5. Test

Leave an echo on the live site, or publish a draft from `/inky`.

Logs: Dashboard → **Edge Functions → notify → Logs**. Every request logs a
result; `resend failed …` there means the email step broke while the webhook
itself worked.

---

## Behaviour notes

**A failed email never fails the write.** If Resend errors, the function logs it
and still returns `200`. Returning non-2xx would make Supabase retry, and a bad
address or exhausted quota would retry indefinitely.

**Echo text is clamped and HTML-escaped.** The `echoes` table is writable by
anyone holding the anon key — which ships in the client bundle — so echo text is
untrusted input. It is truncated to 500 chars and escaped before it enters the
email body.

**Rate limiting is not included.** Someone who extracts the anon key could insert
echoes in a loop and flood the inbox. If that ever happens, the fastest fix is
disabling the `notify_echo` webhook in the dashboard; a durable fix is a
per-minute insert limit on the table.

## Local development

```sh
WEBHOOK_SECRET=testsecret NOTIFY_TO=you@example.com \
NOTIFY_FROM="Inky <onboarding@resend.dev>" RESEND_API_KEY=re_xxx \
deno run --allow-net --allow-env supabase/functions/notify/index.ts
```

```sh
curl -X POST http://localhost:8000 \
  -H 'content-type: application/json' \
  -H 'x-webhook-secret: testsecret' \
  --data-raw '{"type":"INSERT","table":"echoes","record":{"text":"a quiet word back"},"old_record":null}'
```
