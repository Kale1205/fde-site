from pathlib import Path
import json, os, re, sys

PATH=Path('content/site-content.json')

def load():
    return json.loads(PATH.read_text(encoding='utf-8'))

def save(data):
    PATH.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def env(name, default=''):
    return os.environ.get(name, default).strip()

def bool_env(name, default=False):
    v=env(name, 'true' if default else 'false').lower()
    return v in {'1','true','yes','on'}

def slug(text):
    s=text.lower().strip()
    s=re.sub(r'[^a-z0-9]+','-',s).strip('-')
    return s or 'news'

def unique_id(data, base):
    existing={n.get('id') for n in data.get('news',[])}
    if base not in existing:return base
    i=2
    while f'{base}-{i}' in existing:i+=1
    return f'{base}-{i}'

def news_from_env(existing=None):
    n=dict(existing or {})
    n['date']=env('DATE') or n.get('date','')
    n['category']=env('CATEGORY') or n.get('category','Development')
    n['featured']=bool_env('FEATURED',n.get('featured',False))
    n['link']=env('LINK') or n.get('link','#')
    n['image']=env('IMAGE_URL') if 'IMAGE_URL' in os.environ else n.get('image','')
    n['title']={'ja':env('TITLE_JA') or (n.get('title') or {}).get('ja',''),'en':env('TITLE_EN') or (n.get('title') or {}).get('en','')}
    n['body']={'ja':env('BODY_JA') or (n.get('body') or {}).get('ja',''),'en':env('BODY_EN') or (n.get('body') or {}).get('en','')}
    return n

def main():
    if len(sys.argv)<2:raise SystemExit('action required')
    action=sys.argv[1]
    data=load()
    data.setdefault('news',[])
    if action=='add_news':
        n=news_from_env()
        base=f"{n['date'].replace('-','')}-{slug(n['title'].get('en') or n['title'].get('ja'))}"
        n['id']=unique_id(data,base)
        if n['featured']:
            for x in data['news']:x['featured']=False
        data['news'].append(n)
    elif action=='edit_news':
        nid=env('NEWS_ID')
        idx=next((i for i,x in enumerate(data['news']) if x.get('id')==nid),None)
        if idx is None:raise SystemExit(f'news id not found: {nid}')
        n=news_from_env(data['news'][idx]);n['id']=nid
        if n['featured']:
            for x in data['news']:x['featured']=False
        data['news'][idx]=n
    elif action=='delete_news':
        nid=env('NEWS_ID');before=len(data['news'])
        data['news']=[x for x in data['news'] if x.get('id')!=nid]
        if len(data['news'])==before:raise SystemExit(f'news id not found: {nid}')
    elif action=='strip':
        data['latestStrip']={
            'enabled':bool_env('ENABLED',True),
            'label':{'ja':env('LABEL_JA'),'en':env('LABEL_EN')},
            'text':{'ja':env('TEXT_JA'),'en':env('TEXT_EN')},
            'link':env('LINK') or 'news.html'
        }
    elif action=='instagram':
        data['instagram']={
            'profileUrl':env('PROFILE_URL'),
            'handle':env('HANDLE'),
            'description':{'ja':env('DESCRIPTION_JA'),'en':env('DESCRIPTION_EN')},
            'image':env('IMAGE_URL')
        }
    else:
        raise SystemExit(f'unknown action: {action}')
    save(data)

if __name__=='__main__':main()
