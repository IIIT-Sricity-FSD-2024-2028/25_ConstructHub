"""Step 2 marketplace smoke test. Start the backend on a FRESH data/db first, then:  API=http://localhost:3000 python3 tests/api/step2-smoke-test.py [phase2]"""
import json, os, sys, urllib.request, urllib.error, uuid, datetime
B = os.environ.get('API', 'http://localhost:3000')
TODAY = datetime.date.today()
iso = lambda d: d.isoformat()

def call(method, path, body=None, token=None, raw=False, headers=None):
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
    req = urllib.request.Request(B + '/' + path, method=method, data=data)
    if not (headers and 'Content-Type' in headers):
        req.add_header('Content-Type', 'application/json')
    for k, v in (headers or {}).items(): req.add_header(k, v)
    if token: req.add_header('Authorization', 'Bearer ' + token)
    try:
        r = urllib.request.urlopen(req); b = r.read()
        return r.status, (b if raw else (json.loads(b) if b else None))
    except urllib.error.HTTPError as e:
        b = e.read()
        try: return e.code, (b if raw else json.loads(b))
        except Exception: return e.code, b

def multipart(files):
    boundary = uuid.uuid4().hex; parts = []
    for name, filename, mime, content in files:
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    return b''.join(parts), {'Content-Type': f'multipart/form-data; boundary={boundary}'}

ok = True
def check(name, cond, extra=''):
    global ok
    if not cond: print('FAIL ' + name, str(extra)[:300])
    ok = ok and cond

def login(e, p):
    s, d = call('POST', 'auth/login', {'email': e, 'password': p}); assert s == 200, (e, s, d); return d['accessToken']

SU = login('super@ch.com', '123456'); AD1 = login('admin@apex.com', '123456'); AD2 = login('admin@ltinfra.com', '123456')
PM1 = login('pm@apex.com', '123456'); SE1 = login('site@apex.com', '123456')
PM2 = login('pm@ltinfra.com', '123456'); FM1 = login('finance@apex.com', '123456'); FM2 = login('finance@ltinfra.com', '123456')

def estimate(rid, admin, pm_tok, fm_tok, pm_id, fm_id, stages, advance=0, markup=0, valid_days=20):
    """The 3-step estimate: assign PM+FM -> PM stages -> FM costs -> Admin markup and release. stages = [(name, days, internal cost)]."""
    s_, q_ = call('POST', f'requirements/{rid}/assign-team', {'pmId': pm_id, 'fmId': fm_id}, token=admin); assert s_ == 201, (s_, q_)
    s_, d_ = call('PATCH', f"quotations/{q_['id']}/pm-estimate", {'milestoneStages': [{'name': n, 'durationDays': d, 'materialScope': 'Scope of ' + n} for n, d, c in stages]}, token=pm_tok); assert s_ == 200, (s_, d_)
    s_, d_ = call('PATCH', f"quotations/{q_['id']}/fm-estimate", {'stages': [{'internalCost': c} for n, d, c in stages], 'mobilizationAdvancePercent': advance}, token=fm_tok); assert s_ == 200, (s_, d_)
    s_, d_ = call('POST', f"quotations/{q_['id']}/release", {'markupPercent': markup, 'validUntil': iso(TODAY + datetime.timedelta(days=valid_days)), 'notes': 'Smoke quote'}, token=admin); assert s_ == 201, (s_, d_)
    return d_
C1 = login('client1@gmail.com', '123456'); C2 = login('client3@gmail.com', '123456'); C3 = login('client2@gmail.com', '123456')

if len(sys.argv) > 1 and sys.argv[1] == 'phase2':
    s, d = call('GET', 'requirements', token=C1); mine = [r for r in d if r['title'].startswith('SMOKE')]
    check('requirement persisted', len(mine) == 1 and mine[0]['status'] == 'awarded', d)
    r = mine[0]
    s, d = call('GET', 'contracts', token=C1); check('contract persisted', len(d) == 1 and d[0]['requirementId'] == r['id'], d)
    s, d = call('GET', f"requirements/{r['id']}/quotations", token=C1); check('quotations persisted', len(d) >= 2, d)
    docs = r['documents']; check('document metadata persisted', len(docs) == 1, docs)
    s, b = call('GET', f"requirements/{r['id']}/documents/{docs[0]['id']}", token=C1, raw=True); check('document file persisted', s == 200 and b.startswith(b'%PDF'), (s, b[:40]))
    s, d = call('GET', 'projects', token=C1); check('awarded project persisted', any(p.get('requirementId') == r['id'] for p in d), [p['id'] for p in d])
    print('PHASE2 ALL PASS' if ok else 'PHASE2 SOME FAILED'); sys.exit(0 if ok else 1)

# ---- 1. every new route requires authentication
routes = [('GET','requirements'),('POST','requirements'),('GET','requirements/REQ001'),('PATCH','requirements/REQ001'),('POST','requirements/REQ001/close'),
          ('POST','requirements/REQ001/documents'),('GET','requirements/REQ001/documents/D1'),('GET','requirements/REQ001/quotations'),('POST','requirements/REQ001/quotations'),
          ('GET','quotations'),('GET','quotations/QUO001'),('PATCH','quotations/QUO001'),('POST','quotations/QUO001/accept'),('POST','quotations/QUO001/reject'),
          ('POST','quotations/QUO001/withdraw'),('GET','contracts'),('GET','contracts/CON001')]
for m, p in routes:
    s, d = call(m, p, {} if m != 'GET' else None); check(f'{m} /{p} needs auth', s == 401, (s, d))

# ---- 2. role guards
check('company admin cannot post requirement', call('POST','requirements',{},token=AD1)[0] == 403)
check('PM cannot browse requirements', call('GET','requirements',token=PM1)[0] == 403)
check('site engineer cannot list contracts', call('GET','contracts',token=SE1)[0] == 403)
check('client cannot submit quotation', call('POST','requirements/REQ001/quotations',{},token=C1)[0] == 403)
check('client cannot list own-company-only quotations of others via other id', call('GET','quotations/QUO002',token=C2)[0] == 404)

# ---- 3. requirement validation + creation
good = {'title':'SMOKE 2BHK flat construction','description':'Two bedroom flat, 1,100 sq ft, drawings ready for review.','location':'Pune, Maharashtra','projectType':'Residential','budgetMin':3000000,'budgetMax':4500000,'expectedDurationDays':180,'quotationDeadline':iso(TODAY+datetime.timedelta(days=30))}
check('short title rejected', call('POST','requirements',{**good,'title':'abc'},token=C1)[0] == 400)
check('budget max < min rejected', call('POST','requirements',{**good,'budgetMax':1},token=C1)[0] == 400)
check('past deadline rejected', call('POST','requirements',{**good,'quotationDeadline':iso(TODAY-datetime.timedelta(days=1))},token=C1)[0] == 400)
check('bad project type rejected', call('POST','requirements',{**good,'projectType':'Spaceport'},token=C1)[0] == 400)
s, req = call('POST','requirements',good,token=C1); check('client creates requirement', s == 201 and req['status']=='open' and req['quotationCount']==0 and req['clientId']=='U005', (s,req)); RID = req['id']

# ---- 4. client isolation
s, d = call('GET','requirements',token=C1); check('client sees own requirements', {r['id'] for r in d} >= {'REQ001', RID} and all(r['clientId']=='U005' for r in d))
s, d = call('GET','requirements',token=C2); check('other client sees none of them', all(r['id'] not in ('REQ001',RID) for r in d))
check('other client cannot open requirement', call('GET',f'requirements/{RID}',token=C2)[0] == 403)
check('other client cannot edit requirement', call('PATCH',f'requirements/{RID}',{'title':'hacked title'},token=C2)[0] == 403)

# ---- 5. company marketplace view
s, d = call('GET','requirements',token=AD1); ids = {r['id'] for r in d}
check('company sees open requirements', {'REQ001','REQ002',RID} <= ids, ids)
check('company view hides client contact', all('clientEmail' not in r and 'clientPhone' not in r and 'quotationCount' not in r for r in d), d[0])
r1 = [r for r in d if r['id']=='REQ001'][0]; check('hasQuoted flag', r1['hasQuoted'] is True and r1['myQuotationId']=='QUO001', r1)
s, d = call('GET','requirements?location=pune',token=AD1); check('location filter', d and all('pune' in r['location'].lower() for r in d), d)
s, d = call('GET','requirements?q=g%2B2',token=AD1); check('text filter', [r['id'] for r in d]==['REQ002'], [r['id'] for r in d])
s, d = call('GET','requirements?minBudget=15000000',token=AD1); check('budget filter (overlap)', 'REQ002' in [r['id'] for r in d] and 'REQ001' not in [r['id'] for r in d], [r['id'] for r in d])
s, d = call('GET','requirements?scope=mine',token=AD1); check('scope=mine (REQ003 is the awarded requirement behind demo project P001)', {r['id'] for r in d}=={'REQ001','REQ002','REQ003','REQ004'}, [r['id'] for r in d])
s, d = call('GET',f'requirements/{RID}',token=AD1); check('company can open open requirement', s==200 and 'clientEmail' not in d)

# ---- 6. quotation submission
q_body = {'items':[{'description':'Structure','unit':'sq ft','quantity':1100,'rate':1800,'amount':1},{'description':'Finishing','unit':'lump sum','quantity':1,'rate':900000}],'durationDays':170,'validUntil':iso(TODAY+datetime.timedelta(days=20)),'notes':'Smoke quote'}
s, d = call('POST',f'requirements/{RID}/quotations',q_body,token=AD1); check('standalone single-screen quotation is closed (must use the PM -> FM -> Admin estimate)', s==400 and 'PM and FM' in json.dumps(d), (s,d))
check('assign-team rejects a PM from another company', call('POST',f'requirements/{RID}/assign-team',{'pmId':'U007','fmId':'U004'},token=AD1)[0]==400)
qa = estimate(RID, AD1, PM1, FM1, 'U002', 'U004', [('Structure works', 100, 1980000), ('Finishing works', 70, 900000)])
check('company submits quotation through the estimate; total comes from the stages', qa['status']=='submitted' and qa['totalAmount']==2880000 and qa['durationDays']==170 and qa['milestoneStages'][0]['clientAmount']==1980000, qa)
check('second estimate on the same requirement -> 409', call('POST',f'requirements/{RID}/assign-team',{'pmId':'U002','fmId':'U004'},token=AD1)[0]==409)
q2 = {**q_body,'items':[{'description':'Turnkey','unit':'lump sum','quantity':1,'rate':3100000}],'durationDays':150}
qb = estimate(RID, AD2, PM2, FM2, 'U007', 'U009', [('Turnkey build', 150, 3100000)]); check('second company quotes', qb['status']=='submitted' and qb['totalAmount']==3100000, qb)
s, d = call('GET','notifications',token=C1); check('client notified of quotations', sum(1 for n in d if n['title']=='New quotation received')>=2, d[:2])

# ---- 7. confidentiality
s, d = call('GET','quotations',token=AD1); check('company lists only own quotations', d and all(q['companyId']=='COMP001' for q in d))
check("company cannot read competitor's quotation", call('GET',f"quotations/{qb['id']}",token=AD1)[0]==404)
check("company cannot edit competitor's quotation", call('PATCH',f"quotations/{qb['id']}",q_body,token=AD1)[0]==403)
check("company cannot list requirement quotations", call('GET',f'requirements/{RID}/quotations',token=AD1)[0]==403)
check("company cannot accept", call('POST',f"quotations/{qa['id']}/accept",token=AD1)[0]==403)
s, d = call('GET',f'requirements/{RID}',token=AD1); check('company view has no quotation count', 'quotationCount' not in d and d['hasQuoted'])

# ---- 8. client comparison
s, d = call('GET',f'requirements/{RID}/quotations',token=C1); check('client compares quotations sorted by price', s==200 and [q['totalAmount'] for q in d]==[2880000,3100000] and d[0]['company']['name']=='Apex Builders', d)
check('other client cannot compare', call('GET',f'requirements/{RID}/quotations',token=C2)[0]==403)
check('client cannot edit requirement with quotes', call('PATCH',f'requirements/{RID}',{'title':'Changed title here'},token=C1)[0]==409)
s, d = call('GET',f"quotations/{qa['id']}",token=C1); check('client reads quotation', s==200 and 'company' in d)
check('other client cannot read quotation', call('GET',f"quotations/{qa['id']}",token=C2)[0]==404)

# ---- 9. edit / withdraw / resubmit
q_edit = {**q_body,'items':[{'description':'Structure + finishing','unit':'lump sum','quantity':1,'rate':2700000}]}
s, d = call('PATCH',f"quotations/{qa['id']}",q_edit,token=AD1); check('a staged quotation cannot be hand-edited (re-estimate instead)', s==400, (s,d))
s, d = call('POST',f"quotations/{qa['id']}/withdraw",token=AD1); check('owner withdraws', s==201 and d['status']=='withdrawn', (s,d))
s, d = call('GET',f'requirements/{RID}/quotations',token=C1); check('withdrawn hidden from client', [q['companyId'] for q in d]==['COMP002'], d)
check('withdrawn cannot be edited', call('PATCH',f"quotations/{qa['id']}",q_edit,token=AD1)[0]==400)
d = estimate(RID, AD1, PM1, FM1, 'U002', 'U004', [('Structure and finishing', 170, 2700000)]); check('company can re-estimate after withdrawing (same id)', d['id']==qa['id'] and d['status']=='submitted' and d['totalAmount']==2700000, d)

# ---- 10. documents (private)
body, hdr = multipart([('documents','plan.pdf','application/pdf',b'%PDF-1.4 smoke drawing')])
s, d = call('POST',f'requirements/{RID}/documents',body,token=C1,headers=hdr); check('client uploads pdf', s==201 and len(d['documents'])==1 and 'storedName' not in d['documents'][0], (s,d)); DID = d['documents'][0]['id']
body2, hdr2 = multipart([('documents','evil.exe','application/x-msdownload',b'MZ')])
check('executable rejected', call('POST',f'requirements/{RID}/documents',body2,token=C1,headers=hdr2)[0]==400)
body3, hdr3 = multipart([('documents','x.pdf','application/pdf',b'%PDF-1.4 stray')])
check('other client cannot upload to my requirement', call('POST',f'requirements/{RID}/documents',body3,token=C2,headers=hdr3)[0]==403)
check('company cannot upload', call('POST',f'requirements/{RID}/documents',body3,token=AD1,headers=hdr3)[0]==403)
s, b = call('GET',f'requirements/{RID}/documents/{DID}',token=C1,raw=True); check('owner downloads document', s==200 and b==b'%PDF-1.4 smoke drawing', (s,b[:30]))
s, b = call('GET',f'requirements/{RID}/documents/{DID}',token=AD2,raw=True); check('company can download open requirement document', s==200)
check('other client cannot download', call('GET',f'requirements/{RID}/documents/{DID}',token=C2,raw=True)[0]==404)
check('documents not served publicly', call('GET','private-uploads/requirements/'+RID+'/x',raw=True)[0] in (401,404))
stray = os.path.join(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'),'private-uploads','requirements',RID)
files = os.listdir(stray) if os.path.isdir(stray) else []
check('rejected uploads leave no files behind', len(files)==1, files)

# ---- 11. third company (not quoting) + reject
reg = {'company':{'name':'Gamma Build','code':'gamma','domain':'gamma.com'},'admin':{'name':'Gina Admin','email':'admin@gamma.com','password':'Secret123!','phone':'9876500123'}}
s, d = call('POST','companies/register',reg); cid = d['company']['id']; call('PATCH',f'companies/{cid}/approval',{'decision':'approved'},token=SU); AD3 = login('admin@gamma.com','Secret123!')
for role_, nm_, em_ in (('project_manager','Gamma PM','pm@gamma.com'),('finance_manager','Gamma FM','fm@gamma.com')):
    s_, u_ = call('POST','users',{'name':nm_,'email':em_,'password':'Secret123!','phone':'9876500124','role':role_,'status':'active'},token=AD3); assert s_ == 201, (s_, u_)
    if role_ == 'project_manager': GPM = u_['id']
    else: GFM = u_['id']
qc = estimate(RID, AD3, login('pm@gamma.com','Secret123!'), login('fm@gamma.com','Secret123!'), GPM, GFM, [('Gamma build', 150, 3000000)]); check('third company quotes', qc['status']=='submitted', qc)
s, d = call('POST',f"quotations/{qc['id']}/reject",{'reason':'Too slow'},token=C1); check('client rejects a quotation', s==201 and d['status']=='rejected', (s,d))
s, d = call('GET','notifications',token=AD3); check('rejected company notified', any(n['title']=='Quotation not selected' for n in d))
check('rejected quotation cannot be accepted', call('POST',f"quotations/{qc['id']}/accept",token=C1)[0]==400)

# ---- 12. atomic award: company at project limit -> clean failure, nothing created
call('PATCH','companies/COMP002',{'customProjectLimit':1},token=SU); call('PATCH','companies/COMP002/overage',{'overageEnabled':False},token=SU)
before = (len(call('GET','projects',token=SU)[1]), len(call('GET','contracts',token=SU)[1]))
s, d = call('POST',f"quotations/{qb['id']}/accept",token=C1); check('plan limit blocks award with friendly message', s==409 and 'plan' not in json.dumps(d).lower(), (s,d))
after = (len(call('GET','projects',token=SU)[1]), len(call('GET','contracts',token=SU)[1]))
check('failed award leaves nothing behind', before==after, (before,after))
s, d = call('GET',f'requirements/{RID}',token=C1); check('requirement still open after failed award', d['status']=='open')
s, d = call('GET',f"quotations/{qb['id']}",token=C1); check('quotation still submitted after failed award', d['status']=='submitted')
call('PATCH','companies/COMP002',{'customProjectLimit':100},token=SU); call('PATCH','companies/COMP002/overage',{'overageEnabled':True},token=SU)

# ---- 13. award
check('non-owner cannot accept', call('POST',f"quotations/{qa['id']}/accept",token=C2)[0]==403)
s, res = call('POST',f"quotations/{qa['id']}/accept",token=C1); check('client accepts quotation', s==201 and res['requirement']['status']=='awarded' and res['contract']['value']==2700000, (s,res))
CID = res['contract']['id']; PID = res['projectId']
s, d = call('GET',f'requirements/{RID}/quotations',token=C1); st = {q['companyId']:q['status'] for q in d}; check('winner accepted, others rejected', st=={'COMP001':'accepted','COMP002':'rejected','COMP003':'rejected'}, st)
s, d = call('GET','contracts',token=C1); c = [x for x in d if x['id']==CID][0]; check('client sees contract', c['projectId']==PID and c['companyId']=='COMP001' and c['workOrderNumber'].startswith('WO-') and len(c['items'])==1, c)
s, d = call('GET','contracts',token=AD1); check('contractor sees contract', CID in [x['id'] for x in d])
s, d = call('GET','contracts',token=PM1); check('contractor PM sees contract (read-only)', CID in [x['id'] for x in d])
check('other company cannot see contract', call('GET',f'contracts/{CID}',token=AD2)[0]==404 and CID not in [x['id'] for x in call('GET','contracts',token=AD2)[1]])
check('other client cannot see contract', call('GET',f'contracts/{CID}',token=C2)[0]==404)
s, d = call('GET','projects',token=C1); p = [x for x in d if x['id']==PID]; check('project visible to client', p and p[0]['companyId']=='COMP001' and p[0]['budget']==2700000 and p[0]['clientId']=='U005' and p[0]['contractId']==CID and p[0]['status']=='On Track', p)
s, d = call('GET','projects',token=AD1); check('project visible to contractor admin', PID in [x['id'] for x in d])
s, d = call('GET','projects',token=AD2); check('project hidden from other company', PID not in [x['id'] for x in d])
s, d = call('GET','notifications',token=AD1); check('winner admin notified', any(n['title']=='You won a project!' for n in d))
s, d = call('GET','notifications',token=AD2); check('loser admin notified', any(n['title']=='Quotation not selected' for n in d))
s, d = call('GET','notifications',token=C1); check('client notified of contract', any(n['title']=='Contract created' for n in d))
check('accept twice -> 409', call('POST',f"quotations/{qa['id']}/accept",token=C1)[0]==409)
check('cannot quote on awarded requirement', call('POST',f'requirements/{RID}/assign-team',{'pmId':GPM,'fmId':GFM},token=AD3)[0] in (400,404))
check('cannot close awarded requirement', call('POST',f'requirements/{RID}/close',token=C1)[0]==400)
reg4 = {'company':{'name':'Delta Build','code':'delta','domain':'delta.com'},'admin':{'name':'Dan Admin','email':'admin@delta.com','password':'Secret123!','phone':'9876500124'}}
s, d4 = call('POST','companies/register',reg4); call('PATCH',f"companies/{d4['company']['id']}/approval",{'decision':'approved'},token=SU); AD4 = login('admin@delta.com','Secret123!')
s, d = call('GET',f'requirements/{RID}',token=AD4); check('non-quoting company cannot see awarded requirement', s==404, (s,d))
s, d = call('GET','requirements',token=AD4); check('awarded requirement not in non-quoting company browse', RID not in [r['id'] for r in d])
s, d = call('GET',f'requirements/{RID}',token=AD1); check('winner sees awardedToMe', d.get('awardedToMe') is True and 'contractId' not in d, d)
s, d = call('GET',f'requirements/{RID}',token=AD2); check('loser sees awarded, not awardedToMe', d.get('awardedToMe') is False)
s, d = call('GET','requirements',token=SU); check('superuser sees all requirements', {'REQ001','REQ002',RID} <= {r['id'] for r in d})

# ---- 14. close flow on a second requirement
s, r2 = call('POST','requirements',{**good,'title':'SMOKE close me please'},token=C2); R2 = r2['id']
s, q = call('POST',f'requirements/{R2}/assign-team',{'pmId':'U002','fmId':'U004'},token=AD1)
s, d = call('POST',f'requirements/{R2}/close',token=C2); check('client closes requirement', s==201 and d['status']=='closed', (s,d))
s, d = call('GET',f"quotations/{q['id']}",token=AD1); check('closing rejects open quotations', d['status']=='rejected')
check('cannot quote on closed requirement', call('POST',f'requirements/{R2}/assign-team',{'pmId':'U007','fmId':'U009'},token=AD2)[0] in (400,404))
# edit before any quotes
s, r3 = call('POST','requirements',{**good,'title':'SMOKE editable one'},token=C2)
s, d = call('PATCH',f"requirements/{r3['id']}",{'title':'SMOKE edited title','budgetMax':5000000},token=C2); check('client edits requirement without quotes', s==200 and d['title']=='SMOKE edited title', (s,d))
check('edit with invalid budget rejected', call('PATCH',f"requirements/{r3['id']}",{'budgetMax':1},token=C2)[0]==400)
print('PHASE1 ALL PASS' if ok else 'PHASE1 SOME FAILED')
sys.exit(0 if ok else 1)
