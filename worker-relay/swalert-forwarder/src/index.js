const NTFY_TOPIC = 'swalert-phone-to-pc';
const RELAY_URL = 'http://127.0.0.1:8787/relay'; // your local relay for now

export default {
	async scheduled(event, env, ctx) {
		console.log('[Forwarder] Running scheduled sync...');
		ctx.waitUntil(syncNtfyToRelay(env));
	},
	async fetch(req) {
		return new Response('Swalert Forwarder Active', { status: 200 });
	},
};

async function syncNtfyToRelay(env) {
	try {
		// 1️⃣ Read last processed timestamp
		const lastSynced = parseInt(await env.FORWARDER_STATE.get('last_ts')) || 0;
		console.log(`[Forwarder] Last synced timestamp: ${lastSynced}`);

		// 2️⃣ Fetch messages newer than that
		const sinceUrl = `https://ntfy.sh/${NTFY_TOPIC}/json?since=${lastSynced}`;
		const response = await fetch(sinceUrl);
		const raw = await response.text();
		console.log("[Forwarder] Raw ntfy response:", raw.slice(0, 200));

		const lines = raw.split('\n').filter(Boolean);
		let newestTs = lastSynced;

		for (const line of lines) {
			const msg = JSON.parse(line);
			if (msg.event === 'message' && msg.time > lastSynced) {
				await forwardToRelay(msg);
				newestTs = Math.max(newestTs, msg.time);
			}
		}

		// 3️⃣ Update last synced timestamp
		if (newestTs > lastSynced) {
			await env.FORWARDER_STATE.put('last_ts', newestTs.toString());
			console.log(`[Forwarder] Updated last_ts = ${newestTs}`);
		} else {
			console.log('[Forwarder] No new messages.');
		}
	} catch (err) {
		console.error('[Forwarder] Sync error:', err);
	}
}

async function forwardToRelay(msg) {
	const record = {
		title: msg.title || 'ntfy message',
		body: msg.message || '',
		sender: 'ntfy-forwarder'
	};
	console.log(`[Forwarder] Relaying: ${record.body}`);
	await fetch(`${RELAY_URL}?topic=${msg.topic}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(record)
	});
}
