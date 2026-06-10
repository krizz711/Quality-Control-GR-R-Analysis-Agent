import urllib.request

base = 'http://localhost:5173/app/'
files = ['lib.jsx','fx.jsx','charts.jsx','shell.jsx','Dashboard.jsx','GRRStudies.jsx',
         'ReviewQueue.jsx','Alerts.jsx','Assistant.jsx','app.jsx']

all_ok = True
for f in files:
    content = urllib.request.urlopen(base + f).read().decode('utf-8')
    if 'â€' in content:
        print(f'ENCODING ISSUE: {f}')
        all_ok = False
    opens = content.count('{')
    closes = content.count('}')
    delta = opens - closes
    status = 'OK' if abs(delta) <= 5 else 'BRACE IMBALANCE'
    if abs(delta) > 5:
        all_ok = False
    print(f'{status}: {f}  (braces delta={delta})')

if all_ok:
    print('\nAll JSX files: clean')
