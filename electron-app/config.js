// config.js
const ENV = process.env.NODE_ENV || "development";

const CONFIG = {
    development: {
        MODE: "development",
        NTFY_TOPIC: "swalert-phone-to-pc",
        RELAY_URL: "http://127.0.0.1:8787/relay", // local relay worker
    },
    production: {
        MODE: "production",
        NTFY_TOPIC: "swalert-phone-to-pc",
        RELAY_URL: "https://swalert-relay-production.swalert.workers.dev/relay",
    },
};

module.exports = CONFIG[ENV];
