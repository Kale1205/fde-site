(()=>{
// Legacy compatibility shim.
// Direct Gmail/mailto submission was retired in favor of Contact -> Turnstile -> Cloudflare Worker -> Brevo.
// This file intentionally performs no event binding so an old cached HTML reference cannot override the current Contact flow.
window.FDE_LEGACY_CONTACT_MAILER_DISABLED=true;
})();
