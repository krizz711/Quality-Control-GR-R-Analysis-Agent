import os, glob

app_dir = r'c:\Users\Asus\OneDrive\Desktop\Projects\Quality_Control_&_GR&R_Analysis_Agent\app'
issues = 0
for path in glob.glob(os.path.join(app_dir, '*.jsx')):
    with open(path, encoding='utf-8') as f:
        content = f.read()
    if 'â€' in content:
        print(f'STILL CORRUPTED: {os.path.basename(path)}')
        issues += 1

if issues == 0:
    print('All files: encoding clean')

lib = open(os.path.join(app_dir, 'lib.jsx'), encoding='utf-8').read()
idx = lib.find("fontSize: ", lib.find("Badge"))
print('Badge fontSize check:', repr(lib[idx:idx+20]))

dash = open(os.path.join(app_dir, 'Dashboard.jsx'), encoding='utf-8').read()
idx2 = dash.find("fontSize: ", dash.find("SectionTitle"))
print('Dashboard SectionTitle fontSize check:', repr(dash[idx2:idx2+20]))

# Check em dash is correct
if '—' in lib:
    print('Em dash OK in lib.jsx')
else:
    print('Em dash MISSING from lib.jsx')
