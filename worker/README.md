# Kale’s FDE Contact Worker

This Worker receives Contact form submissions, sends the inquiry to the site owner, and sends an automatic confirmation email to the visitor.

## Required Cloudflare settings

Connect the GitHub repository `Kale1205/fde-site` to a Cloudflare Worker and use `worker` as the root directory.

The Worker name is `kales-fde-contact`.

### Variables

- `ALLOWED_ORIGIN` = `https://kale1205.github.io`
- `ADMIN_EMAIL` = `reyouinjune@gmail.com`
- `FROM_NAME` = `Kale’s FDE`
- `FROM_EMAIL` = a sender address verified in Brevo

### Secret

- `BREVO_API_KEY` = Brevo transactional-email API key

Never commit `BREVO_API_KEY` to GitHub.

## Brevo

Create/verify a sender in Brevo, create an API key, then store that API key as the Cloudflare Worker secret `BREVO_API_KEY`.

## Activate on the public site

After Cloudflare deploys the Worker, copy the public `https://...workers.dev` URL and set it in `contact-config.js`:

```js
window.FDE_CONTACT_API = 'https://YOUR-WORKER.workers.dev';
```

Until that URL is set, the public Contact page intentionally falls back to the existing FormSubmit endpoint so inquiries continue to work during migration.
