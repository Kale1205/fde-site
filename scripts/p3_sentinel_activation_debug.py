#!/usr/bin/env python3
from pathlib import Path
import json
import sys

import kale_sentinel_probe as probe
from kale_sentinel_live import install_http_identity

OUT = Path('sentinel-debug-report')
install_http_identity()
code = probe.run_live(OUT)
report_path = OUT / 'kale-sentinel-report.json'
if report_path.exists():
    report = json.loads(report_path.read_text(encoding='utf-8'))
    print(json.dumps({
        'verdict': report.get('verdict'),
        'summary': report.get('summary'),
        'observations': report.get('observations'),
        'findings': report.get('findings'),
    }, ensure_ascii=False, indent=2))
else:
    print('Sentinel debug report missing')
sys.exit(code)
