
For Production Logs

npx wrangler tail swalert-forwarder-production
npx wrangler tail swalert-relay-production



Sanity Check

curl -i https://swalert-forwarder-production.swalert.workers.dev
curl -i https://swalert-relay-production.swalert.workers.dev



Test direct message injection (bypass forwarder)

```
curl -X POST https://swalert-relay-production.swalert.workers.dev/relay \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Direct Relay Test",
    "body": "Hello from curl → relay → Electron!",
    "sender": "manual-test"
  }'
```