import json, sys, urllib.request, urllib.error
import os
B=os.environ.get("API","http://localhost:3000")
def call(m,p,b=None,t=None):
    r=urllib.request.Request(B+'/'+p,method=m,data=None if b is None else json.dumps(b).encode()); r.add_header('Content-Type','application/json')
    if t: r.add_header('Authorization','Bearer '+t)
    try:
        x=urllib.request.urlopen(r); return x.status, json.loads(x.read() or 'null')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, None
ok=True
def check(n,c,x=''):
    global ok
    if not c: print('FAIL',n,str(x)[:200])
    ok=ok and c
good={'name':'Reg Client','email':'regclient@example.com','password':'Secret123','phone':'9876500999'}
s,d=call('POST','auth/register-client',good); check('signup ok',s==201 and d['user']['role']=='client' and d['user']['companyId']=='' and 'password' not in d['user'],(s,d))
s,d=call('POST','auth/register-client',good); check('duplicate email rejected',s==400,(s,d))
s,d=call('POST','auth/register-client',{**good,'email':'REGCLIENT@example.com'}); check('duplicate email (case) rejected',s==400,(s,d))
s,d=call('POST','auth/register-client',{**good,'email':'a1@example.com','password':'short'}); check('weak password rejected',s==400,(s,d))
s,d=call('POST','auth/register-client',{**good,'email':'a2@example.com','name':'<script>'}); check('bad name rejected',s==400,(s,d))
s,d=call('POST','auth/register-client',{**good,'email':'a3@example.com','phone':'123'}); check('bad phone rejected',s==400,(s,d))
s,d=call('POST','auth/register-client',{**good,'email':'a4@example.com','role':'superuser','companyId':'COMP001'}); 
s2,d2=call('POST','auth/login',{'email':'a4@example.com','password':'Secret123'}); check('cannot self-assign role or company',s==201 and d2['user']['role']=='client' and d2['user']['companyId']=='',(s,d2))
s,d=call('POST','auth/login',{'email':'regclient@example.com','password':'Secret123'}); check('new client can log in',s==200); T=d['accessToken']
s,d=call('GET','requirements',None,T); check('new client has empty list',s==200 and d==[])
s,d=call('POST','requirements',{'title':'Client signup flow','description':'Sample description text','location':'Pune','projectType':'Residential','budgetMin':1,'budgetMax':2},T); check('new client can post',s==201,(s,d))
for i in range(5):
    s,d=call('POST','auth/register-client',{**good,'email':f'spam{i}@example.com'})
check('signup rate limit kicks in (429)',s==429,s)
print('T3 ALL PASS' if ok else 'T3 SOME FAILED')
sys.exit(0 if ok else 1)
