#!/usr/bin/env python3
import urllib.error
import urllib.request

URLS = [
    'https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/health',
    'https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/p2-7',
    'https://kales-fde-contact-staging.reyouinjune.workers.dev/__staging/p2-8',
    'https://kales-fde-staging.pages.dev/fde-site/',
]

for url in URLS:
    for label, headers in [
        ('default', {}),
        ('ua', {'User-Agent': 'baked-kale-sentinel/1.0', 'Accept': '*/*'}),
    ]:
        req = urllib.request.Request(url, headers=headers, method='GET')
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                print(label, response.status, url, response.headers.get('server'), response.headers.get('cf-ray'))
                response.read(64)
        except urllib.error.HTTPError as error:
            print(label, 'HTTP', error.code, url, error.headers.get('server'), error.headers.get('cf-ray'))
        except Exception as error:
            print(label, type(error).__name__, url)
