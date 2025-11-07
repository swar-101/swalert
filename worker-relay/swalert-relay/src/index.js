// 🛰️ Swalert Relay Worker
// Receives messages from the Forwarder or ntfy webhook,
// stores them in KV (7-day TTL), and serves them via GET requests.

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const topic = url.searchParams.get("topic") || "default";

		try {
			// --- Handle CORS preflight ---
			if (request.method === "OPTIONS") {
				return new Response(null, { status: 204, headers: corsHeaders() });
			}

			// --- POST: /relay (from Forwarder)
			if (request.method === "POST" && url.pathname === "/relay") {
				const data = await request.json().catch(() => ({}));

				const key = `${topic}:${Date.now()}`;
				const record = {
					topic,
					title: data.title || null,
					body: data.body || "",
					sender: data.sender || "unknown",
					time: Date.now(),
				};

				await putSafely(env.RELAY, key, record);
				console.log(`[Relay:${env.MODE}] Stored message from ${record.sender}`);

				return jsonResponse({ status: "stored", key }, 201);
			}

			// --- POST: /ntfy-webhook (from ntfy directly)
			if (request.method === "POST" && url.pathname === "/ntfy-webhook") {
				const raw = await request.text();
				let data;
				try {
					data = JSON.parse(raw);
				} catch {
					data = { body: raw }; // fallback for plain text
				}

				const title = data.title || "ntfy event";
				const body = data.message || data.body || "(no content)";
				const sender = "ntfy-webhook";

				const key = await _storeMessage(env, topic, title, body, sender);
				console.log(`[Relay:${env.MODE}] Stored ntfy event: ${title}`);

				return jsonResponse({ status: "stored (ntfy)", key }, 201);
			}

			// --- GET: /relay?topic=xxx&since=timestamp
			if (request.method === "GET" && url.pathname === "/relay") {
				const since = parseInt(url.searchParams.get("since") || "0", 10);
				const list = await env.RELAY.list({ prefix: `${topic}:` });
				const messages = await Promise.all(list.keys.map(k => env.RELAY.get(k.name)));

				let parsed = messages
					.filter(Boolean)
					.map(m => JSON.parse(m))
					.sort((a, b) => a.time - b.time);

				if (since > 0) {
					parsed = parsed.filter(m => m.time > since);
				}

				console.log(`[Relay:${env.MODE}] Returned ${parsed.length} messages`);
				return jsonResponse(parsed);
			}

			// --- Default route
			return new Response("Swalert Relay Active ✅", {
				status: 200,
				headers: corsHeaders(),
			});
		} catch (err) {
			console.error(`[Relay:${env.MODE}] Error:`, err);
			return jsonResponse({ error: "Internal Server Error" }, 500);
		}
	},
};

// --- Store a message in KV with TTL (7 days)
async function _storeMessage(env, topic, title, body, sender) {
	const key = `${topic}:${Date.now()}`;
	const record = {
		topic,
		title,
		body,
		sender,
		time: Date.now(),
	};
	await putSafely(env.RELAY, key, record);
	return key;
}

// --- Safe KV put with TTL and error boundary
async function putSafely(kv, key, value) {
	try {
		await kv.put(key, JSON.stringify(value), { expirationTtl: 604800 }); // 7 days
	} catch (err) {
		console.error("[Relay] KV put failed:", err);
	}
}

// --- Helper: standard JSON response with CORS
function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			...corsHeaders(),
		},
	});
}

// --- Helper: CORS headers
function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
}
