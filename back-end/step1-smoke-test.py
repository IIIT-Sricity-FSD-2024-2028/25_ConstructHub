import json, urllib.request, sys
import os
B=os.environ.get('API','http://localhost:3000')
def call(method, path, body=None, token=None):
    req=urllib.request.Request(B+'/'+path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header('Content-Type','application/json')
    if token: req.add_header('Authorization','Bearer '+token)
    try:
        r=urllib.request.urlopen(req); raw=r.read().decode(); return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw=e.read().decode()
        try: return e.code, json.loads(raw)
        except: return e.code, raw
def login(e,p):
    s,d=call('POST','auth/login',{'email':e,'password':p}); return s,d
ok=True
def check(name, cond, extra=''):
    global ok
    print(('PASS ' if cond else 'FAIL ')+name+(' '+str(extra) if not cond else ''))
    ok = ok and cond

# --- login rules
s,d=login('super@ch.com','123456'); check('superuser login',s==200,(s,d)); SU=d['accessToken']
s,d=login('admin@apex.com','123456'); check('company admin login',s==200); AD=d['accessToken']
s,d=login('client@apex.com','123456'); check('client login',s==200); CL=d['accessToken']; check('client token has empty companyId', d['user']['companyId']=='', d['user'])
check('password not leaked', 'password' not in d['user'])
s,d=login('client@apex.com','password123'); check('interchangeable password shortcut removed',s==401,(s,d))
s,d=login('client2@apex.com','password123'); check('client2 seed password works',s==200)
s,d=login('client2@apex.com','123456'); check('client2 wrong pw rejected',s==401)
# forged mock token
s,d=call('GET','users',token='mock_jwt_U000_superuser_')
check('forged mock token rejected',s==401,(s,d))
s,d=call('GET','users')
check('no token rejected',s==401)

# --- company registration -> pending
reg={'company':{'name':'Test Infra','code':'testinfra','domain':'testinfra.com','plan':'Enterprise','customUserLimit':9999,'overageEnabled':True},
     'admin':{'name':'Tess Admin','email':'admin@testinfra.com','password':'Secret123!','phone':'+91 90000 00000'}}
s,d=call('POST','companies/register',reg); check('register ok',s==201,(s,d)); cid=d['company']['id']
check('registered company is pending', d['company']['approvalStatus']=='pending', d)
s,d=login('admin@testinfra.com','Secret123!'); check('pending company admin cannot log in',s==403 and 'awaiting approval' in json.dumps(d),(s,d))
s,d=call('GET',f'companies/{cid}',token=SU); check('privileged fields not self-assignable', d.get('customUserLimit') is None and not d.get('overageEnabled'), d)
s,d=call('PATCH',f'companies/{cid}/approval',{'decision':'approved'},token=AD); check('company admin cannot approve',s==403,(s,d))
s,d=call('PATCH',f'companies/{cid}/approval',{'decision':'rejected'},token=SU); check('reject needs reason',s==400,(s,d))
s,d=call('PATCH',f'companies/{cid}/approval',{'decision':'maybe'},token=SU); check('invalid decision rejected',s==400,(s,d))
s,d=call('PATCH',f'companies/{cid}/approval',{'decision':'approved'},token=SU); check('superuser approves',s==200 and d['approvalStatus']=='approved',(s,d))
s,d=login('admin@testinfra.com','Secret123!'); check('approved company admin can log in',s==200,(s,d)); TAD=d['accessToken']
s,d=call('PATCH',f'companies/{cid}/approval',{'decision':'rejected','reason':'Docs invalid'},token=SU); check('superuser can reject later',s==200)
s,d=call('GET','projects',token=TAD); check('existing token blocked after rejection',s==403,(s,d))
s,d=login('admin@testinfra.com','Secret123!'); check('rejected login shows reason',s==403 and 'Docs invalid' in json.dumps(d),(s,d))
call('PATCH',f'companies/{cid}/approval',{'decision':'approved'},token=SU)
s,d=login('admin@testinfra.com','Secret123!'); TAD=d['accessToken']
# self-service whitelist
s,d=call('PATCH',f'companies/{cid}',{'approvalStatus':'approved','customUserLimit':5000,'status':'active','phone':'9876500001'},token=TAD)
s2,d2=call('GET',f'companies/{cid}',token=SU); check('company admin cannot change protected company fields', d2.get('customUserLimit') is None and d2['phone']=='9876500001',(d2))
s,d=call('PATCH',f'companies/{cid}',{'plan':'Nope'},token=TAD); check('unknown plan rejected',s==400)
s,d=call('PATCH','companies/COMP001',{'phone':'x'},token=TAD); check('cannot edit other company',s==403)
s,d=call('POST','companies',{'name':'x','code':'x1','domain':'x1.com','ownerEmail':'a@x1.com'},token=AD); check('company admin cannot create companies',s==403)

# --- plans
s,d=call('GET','plans'); check('plans public',s==200 and len(d['plans'])==3,(s,d))
s,d=call('PATCH','plans/Basic',{'monthlyPrice':5999},token=AD); check('company admin cannot edit plans',s==403)
s,d=call('PATCH','plans/Basic',{'monthlyPrice':-1},token=SU); check('negative price rejected',s==400,(s,d))
s,d=call('PATCH','plans/Basic',{'monthlyPrice':5999,'annualPrice':59990,'userLimit':12},token=SU); check('superuser edits plan',s==200 and d['monthlyPrice']==5999 and d['userLimit']==12,(s,d))
s,d=call('PATCH','plans/Nope',{'monthlyPrice':1},token=SU); check('unknown plan 404',s==404)
s,d=call('PATCH','plans/overage-rates',{'extraUserMonthly':599},token=SU); check('overage rates edit',s==200 and d['extraUserMonthly']==599,(s,d))
s,d=call('GET','plans'); check('plan change visible publicly', [p for p in d['plans'] if p['name']=='Basic'][0]['monthlyPrice']==5999 and d['overageRates']['extraUserMonthly']==599)
s,d=call('GET','companies/platform/revenue',token=SU); check('revenue endpoint works',s==200)

# --- client platform-level behaviour
s,d=call('GET','users',token=CL); names=sorted(u['email'] for u in d); check('client sees self + own company staff only', all(e.endswith('@apex.com') for e in names) and 'client@apex.com' in names and 'client2@apex.com' not in names and 'super@ch.com' not in names, names)
s,d=call('GET','projects',token=CL); check('client sees own projects', s==200 and all(p['clientId']=='U005' for p in d) and len(d)>=1,(s,[p['id'] for p in d]))
s,d=call('GET','companies',token=CL); check('client sees only project companies (sanitized)', s==200 and [c['id'] for c in d]==['COMP001'] and 'ownerEmail' not in d[0],(s,d))
s,d=call('GET','companies/COMP002',token=CL); check('client cannot view unrelated company',s==403)
s,d=call('GET','users/U010',token=CL); check('client cannot view other client',s==403)
s,d=call('GET','users/U002',token=CL); check('client can view own PM',s==200)
s,d=call('GET','users/U007',token=CL); check('client cannot view other company staff',s==403)
s,d=call('PATCH','users/U005',{'phone':'9876543211'},token=CL); check('client can update self',s==200 and d['companyId']=='',(s,d))
# company admin scoping of clients
s,d=call('GET','users',token=AD); em=sorted(u['email'] for u in d if u['role']=='client'); check('company admin sees own clients only', 'client@apex.com' in em and 'client2@apex.com' in em and 'client@ltinfra.com' not in em, em)
s,d=login('admin@ltinfra.com','123456'); LAD=d['accessToken']
s,d=call('PATCH','users/U005',{'phone':'9876543222'},token=LAD); check('other company admin cannot edit client',s==403,(s,d))
s,d=call('DELETE','users/U005',token=LAD); check('other company admin cannot delete client',s==403,(s,d))
s,d=call('GET','users/U005',token=LAD); check('other company admin cannot view client',s==403)
# create client through company admin stays platform-level
s,d=call('POST','users',{'name':'New Client','email':'newclient@gmail.com','password':'Passw0rd!','role':'client'},token=AD); check('admin creates client',s==201 and d['companyId']=='' and d['invitedByCompanyId']=='COMP001',(s,d)); NC=d['id']
s,d=login('newclient@gmail.com','Passw0rd!'); check('new client can log in with hashed pw',s==200,(s,d))
s,d=call('PATCH',f'users/{NC}',{'name':'Renamed'},token=AD); check('admin edit keeps client platform-level', s==200 and d['companyId']=='',(s,d))
# messages from client
s,d=call('POST','messages',{'from':'U005','to':'U002','text':'hello pm','senderId':'U005','receiverId':'U002'},token=CL); check('client can send message',s==201 and d['companyId']=='COMP001',(s,d))
s,d=call('GET','messages',token=CL); check('client reads own messages',s==200 and len(d)>=1)
# bills
s,d=call('GET','bills',token=CL); check('client bills scoped', s==200 and all(b['clientId']=='U005' for b in d),(s,))
print('ALL PASS' if ok else 'SOME FAILED')
sys.exit(0 if ok else 1)
