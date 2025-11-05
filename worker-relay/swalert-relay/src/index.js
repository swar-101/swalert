export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const topic = url.searchParams.get("topic") || "default";

		// --- CORS preflight ---
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders()
			});
		}

		// ----- POST: store message -----
		if (request.method === "POST" && url.pathname === "/relay") {
			const data = await request.json();
			const key = `${topic}:${Date.now()}`; // unique key per message
			const record = {
				topic,
				title: data.title || null,
				body: data.body || "",
				sender: data.sender || null,
				time: Date.now(),
			};
			// store with 7-day TTL (604800 seconds)
			await env.RELAY.put(key, JSON.stringify(record), { expirationTtl: 604800 });

			return new Response(JSON.stringify({ status: "stored", key }), {
				headers: {
					"Content-Type": "application/json",
					...corsHeaders(),
				},
				status: 201,
			});
		}

		// ----- POST: /ntfy-webhook (automatic from ntfy) -----
		if (request.method === "POST" && url.pathname === "/ntfy-webhook") {
			const raw = await request.text();
			let data;
			try {
				data = JSON.parse(raw);
			} catch {
				data = { body: raw }; // fallback for plain text payloads
			}

			const title = data.title || "ntfy event";
			const body = data.message || data.body || "(no content)";
			const sender = "ntfy-webhook";

			const key = await _storeMessage(env, topic, title, body, sender);

			return new Response(JSON.stringify({ status: "stored (ntfy)", key }), {
				headers: {
					"Content-Type": "application/json",
					...corsHeaders(),
				},
				status: 201,
			});
		}

		// ----- GET: fetch messages -----
		if (request.method === "GET" && url.pathname === "/relay") {
			const since = parseInt(url.searchParams.get("since") || "0", 10);
			const list = await env.RELAY.list({ prefix: `${topic}:` });

			const messages = await Promise.all(
				list.keys.map(k => env.RELAY.get(k.name))
			);

			let parsed = messages
				.filter(Boolean)
				.map(m => JSON.parse(m))
				.sort((a, b) => a.time - b.time);

			// --- filter since=<timestamp> ---
			if (since > 0) {
				parsed = parsed.filter(m => m.time > since);
			}

			return new Response(JSON.stringify(parsed), {
				headers: {
					"Content-Type": "application/json",
					...corsHeaders(),
				},
			});
		}

		// ----- default -----
		return new Response("Swalert Cloudflare Relay OK", {
			status: 200,
			headers: corsHeaders(),
		});
	},
};

async function _storeMessage(env, topic, title, body, sender) {
	const key = `${topic}:${Date.now()}`;
	const record = {
		topic,
		title: title || null,
		body: body || "",
		sender: sender || null,
		time: Date.now(),
	};
	await env.RELAY.put(key, JSON.stringify(record), { expirationTtl: 604800 }); // 7 days
	return key;
}

// --- helper for consistent CORS headers ---
function corsHeaders() {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
}
