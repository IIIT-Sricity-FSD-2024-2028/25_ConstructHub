"""Step 6 expenses, payments & dashboards smoke test. Fresh data/db first, then:  API=http://localhost:3000 python3 tests/api/step6-smoke-test.py [phase2]"""
import json, os, sys, urllib.request, urllib.error, uuid, datetime
B = os.environ.get('API', 'http://localhost:3000')
TODAY = datetime.date.today(); iso = lambda d: d.isoformat()
def call(method, path, body=None, token=None, raw=False, headers=None):
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
    req = urllib.request.Request(B + '/' + path, method=method, data=data)
    if not (headers and 'Content-Type' in headers): req.add_header('Content-Type', 'application/json')
    for k, v in (headers or {}).items(): req.add_header(k, v)
    if token: req.add_header('Authorization', 'Bearer ' + token)
    try:
        r = urllib.request.urlopen(req); b = r.read(); return r.status, (b if raw else (json.loads(b) if b else None))
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
    if not cond: print('FAIL ' + name, str(extra)[:400])
    ok = ok and cond
def login(e, p='123456'):
    s, d = call('POST', 'auth/login', {'email': e, 'password': p}); assert s == 200, (e, s, d); return d['accessToken']
SU=login('super@ch.com'); AD1=login('admin@apex.com'); PM1=login('pm@apex.com'); SE1=login('site@apex.com'); FM1=login('finance@apex.com'); PR1=login('proc@apex.com')
AD2=login('admin@ltinfra.com'); PM2=login('pm@ltinfra.com'); SE2=login('site@ltinfra.com'); FM2=login('finance@ltinfra.com')
C1=login('client1@gmail.com'); C2=login('client3@gmail.com'); C3=login('client2@gmail.com')
proj = lambda tok, pid: call('GET', f'projects/{pid}', token=tok)[1]
msg = lambda r: json.dumps(r[1])
exp = lambda tok, eid: call('GET', f'expenses/{eid}', token=tok)

if len(sys.argv) > 1 and sys.argv[1] == 'phase2':
    s, d = call('GET', 'expenses', token=AD1); st = {e['description']: e['status'] for e in d}
    check('expense statuses persisted', st.get('Diesel for mixer') == 'approved' and st.get('Rejected sample cost') == 'rejected', st)
    check('project spent persisted (approved only)', proj(AD1,'P001')['spent'] == sum(e['amount'] for e in d if e['projectId']=='P001' and e['status']=='approved'))
    s, d = call('GET', 'bills/B001/payments', token=C1); check('payments persisted', s == 200 and len(d) == 3 and sum(p['amount'] for p in d) == 4500000, d)
    check('bill payment fields persisted', call('GET','bills/B001',token=C1)[1]['paymentStatus'] == 'Paid')
    e = next(x for x in call('GET','expenses',token=SE1)[1] if x['description']=='Diesel for mixer' and x['receipts']); r = e['receipts'][0]
    s, b = call('GET', f"expenses/{e['id']}/receipts/{r['id']}", token=PM1, raw=True); check('receipt file persisted', s == 200 and b.startswith(b'%PDF'), (s, b[:30]))
    print('PHASE2 ALL PASS' if ok else 'PHASE2 SOME FAILED'); sys.exit(0 if ok else 1)

# ---- 1. auth everywhere
for m, p in [('GET','expenses'),('POST','expenses'),('GET','expenses/E001'),('PATCH','expenses/E001'),('POST','expenses/E001/withdraw'),('POST','expenses/E001/receipts'),('GET','expenses/E001/receipts/R1'),
             ('POST','expenses/E001/verify'),('POST','expenses/E001/pm-return'),('POST','expenses/E001/pm-reject'),('POST','expenses/E001/approve'),('POST','expenses/E001/return'),
             ('POST','expenses/E001/reject'),('POST','expenses/E001/reimburse'),('GET','bills/B001/payments'),('POST','bills/B001/payments'),('GET','payments'),('GET','dashboard')]:
    check(f'{m} /{p} needs auth', call(m, p, {} if m != 'GET' else None)[0] == 401)

# ---- 2. legacy expenses become approved; spent = approved only
s, d = call('GET','expenses',token=AD1); leg = {e['id']: e for e in d if e['id'] in ('E001','E002')}
check('legacy expenses migrated to approved with history', all(e['status']=='approved' and e['history'][0]['step']=='recorded' for e in leg.values()) and len(leg) == 2, leg)
check('project spent equals approved expenses', proj(AD1,'P001')['spent'] == 450000 and proj(AD1,'P002')['spent'] == 280000, (proj(AD1,'P001')['spent'], proj(AD1,'P002')['spent']))

# ---- 3. submit
good = {'projectId':'P001','milestoneId':'MS001','category':'Equipment','amount':4500,'date':iso(TODAY),'description':'Diesel for mixer'}
check('invalid category rejected', call('POST','expenses',{**good,'category':'Fun'},SE1)[0] == 400)
check('zero amount rejected', call('POST','expenses',{**good,'amount':0},SE1)[0] == 400 and call('POST','expenses',{**good,'amount':-10},SE1)[0] == 400)
check('three decimals rejected', call('POST','expenses',{**good,'amount':10.123},SE1)[0] == 400)
check('short description rejected', call('POST','expenses',{**good,'description':'ab'},SE1)[0] == 400)
check('future date rejected', call('POST','expenses',{**good,'date':iso(TODAY+datetime.timedelta(days=2))},SE1)[0] == 400)
check("other company's project -> 404", call('POST','expenses',{**good,'projectId':'P003'},SE1)[0] == 404)
check('only site engineers submit', all(call('POST','expenses',good,t)[0] == 403 for t in (PM1, FM1, AD1, PR1, C1, SU)))
check('client-sent status/ids are ignored', (lambda r: r[0]==201 and r[1]['status']=='submitted' and r[1]['submittedBy']=='U003')(call('POST','expenses',{**good,'description':'Mass of nails','amount':300,'status':'approved','submittedBy':'U004','companyId':'COMP002'},SE1)))
s, e1 = call('POST','expenses',good,SE1); check('SE submits expense', s==201 and e1['status']=='submitted' and len(e1['history'])==1 and e1['projectName']=='Apex Skyline Tower', (s,e1)); E1 = e1['id']
check('PM notified', any(x['title']=='Expense awaiting verification' for x in call('GET','notifications',token=PM1)[1]))
s, dup = call('POST','expenses',good,SE1); check('duplicate claim is flagged', dup['duplicateOf'] == [E1], dup)
check('submitting does not change project spend', proj(AD1,'P001')['spent'] == 450000)

# ---- 4. visibility
check('SE sees own claims only', all(x['submittedBy']=='U003' for x in call('GET','expenses',token=SE1)[1]) and call('GET','expenses',token=SE2)[1] == [])
check("other company cannot read it", exp(SE2,E1)[0] == 404 and exp(PM2,E1)[0] == 404 and exp(FM2,E1)[0] == 404 and exp(AD2,E1)[0] == 404)
check('PM / FM / admin can read it', exp(PM1,E1)[0] == 200 and exp(FM1,E1)[0] == 200 and exp(AD1,E1)[0] == 200)
check('client sees no expenses', call('GET','expenses',token=C1)[1] == [] and exp(C1,E1)[0] == 403)
check('procurement has no expense access', call('GET','expenses',token=PR1)[0] == 403)
s, d = call('GET','expenses?status=submitted',token=PM1); check('status filter works', d and all(x['status']=='submitted' for x in d))

# ---- 5. receipts
pdf, hdr = multipart([('receipts','bill.pdf','application/pdf',b'%PDF-1.4 diesel bill')])
check('other engineer cannot attach', call('POST',f'expenses/{E1}/receipts',pdf,SE2,headers=hdr)[0] in (403,404))
check('PM cannot attach', call('POST',f'expenses/{E1}/receipts',pdf,PM1,headers=hdr)[0] == 403)
bad, hb = multipart([('receipts','run.exe','application/x-msdownload',b'MZ')])
check('executable rejected', call('POST',f'expenses/{E1}/receipts',bad,SE1,headers=hb)[0] == 400)
big, hbig = multipart([('receipts','big.pdf','application/pdf',b'%PDF' + b'0' * (5 * 1024 * 1024 + 10))])
check('file over 5 MB rejected', call('POST',f'expenses/{E1}/receipts',big,SE1,headers=hbig)[0] in (400,413))
s, d = call('POST',f'expenses/{E1}/receipts',pdf,SE1,headers=hdr); check('SE attaches receipt', s==201 and len(d['receipts'])==1 and 'storedName' not in d['receipts'][0], (s,d)); RID = d['receipts'][0]['id']
s, b = call('GET',f'expenses/{E1}/receipts/{RID}',token=PM1,raw=True); check('PM downloads receipt', s==200 and b==b'%PDF-1.4 diesel bill', (s,b[:30]))
check('FM and SE download receipt', call('GET',f'expenses/{E1}/receipts/{RID}',token=FM1,raw=True)[0]==200 and call('GET',f'expenses/{E1}/receipts/{RID}',token=SE1,raw=True)[0]==200)
check('other company / client cannot download', call('GET',f'expenses/{E1}/receipts/{RID}',token=PM2,raw=True)[0]==404 and call('GET',f'expenses/{E1}/receipts/{RID}',token=C1,raw=True)[0]==403)
check('receipts are not served publicly', call('GET',f'private-uploads/expenses/{E1}/x',raw=True)[0] in (401,404))
files = os.listdir(os.path.join(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'),'private-uploads','expenses',E1))
check('rejected uploads leave no files behind', len(files)==1, files)

# ---- 6. project manager step (verify / return / reject)
check('FM cannot verify', call('POST',f'expenses/{E1}/verify',{},FM1)[0] == 403)
check("other company's PM cannot verify", call('POST',f'expenses/{E1}/verify',{},PM2)[0] == 404)
check('FM cannot approve before PM verification', (lambda r: r[0]==409 and 'not verified' in msg(r))(call('POST',f'expenses/{E1}/approve',{},FM1)))
s, nr = call('POST','expenses',{**good,'amount':2500,'description':'No receipt yet'},SE1)
check('receipt required above 1,000', (lambda r: r[0]==400 and 'receipt is required' in msg(r))(call('POST',f"expenses/{nr['id']}/verify",{},PM1)))
check('return needs a reason', call('POST',f"expenses/{nr['id']}/pm-return",{},PM1)[0] == 400)
s, d = call('POST',f"expenses/{nr['id']}/pm-return",{'note':'Please attach the bill'},PM1); check('PM returns expense', s==201 and d['status']=='returned' and d['history'][-1]['note']=='Please attach the bill', (s,d))
check('SE notified of return', any(x['title']=='Expense returned' for x in call('GET','notifications',token=SE1)[1]))
check('returned expense cannot be verified', call('POST',f"expenses/{nr['id']}/verify",{},PM1)[0] == 409)
check('only the owner can correct', call('PATCH',f"expenses/{nr['id']}",{'amount':10},SE2)[0] in (403,404))
check('corrections are validated', call('PATCH',f"expenses/{nr['id']}",{'amount':-1},SE1)[0] == 400)
s, d = call('PATCH',f"expenses/{nr['id']}",{'amount':2400,'description':'Hire of vibrator for slab'},SE1); check('SE corrects and resubmits', s==200 and d['status']=='submitted' and d['amount']==2400 and d['history'][-1]['step']=='resubmitted', (s,d))
check('only returned expenses can be edited', call('PATCH',f"expenses/{nr['id']}",{'amount':5},SE1)[0] == 409)
s, d = call('POST',f"expenses/{nr['id']}/pm-reject",{'note':'Not a project cost'},PM1); check('PM rejects (final)', s==201 and d['status']=='rejected', (s,d))
check('rejected expense cannot be touched again', call('POST',f"expenses/{nr['id']}/verify",{},PM1)[0] == 409 and call('PATCH',f"expenses/{nr['id']}",{'amount':5},SE1)[0] == 409)
s, d = call('POST',f'expenses/{E1}/verify',{'note':'Looks right'},PM1); check('PM verifies', s==201 and d['status']=='pm_verified', (s,d))
check('FM notified of verified expense', any(x['title']=='Expense awaiting approval' for x in call('GET','notifications',token=FM1)[1]))
check('verified expense cannot be verified twice', call('POST',f'expenses/{E1}/verify',{},PM1)[0] == 409)
check('verified expense cannot be withdrawn or edited by SE', call('POST',f'expenses/{E1}/withdraw',token=SE1)[0] == 409 and call('PATCH',f'expenses/{E1}',{'amount':1},SE1)[0] == 409)
check('receipts cannot be added after verification', call('POST',f'expenses/{E1}/receipts',pdf,SE1,headers=hdr)[0] == 409)

# ---- 7. finance manager step
check('PM cannot approve', call('POST',f'expenses/{E1}/approve',{},PM1)[0] == 403)
check("other company's FM cannot approve", call('POST',f'expenses/{E1}/approve',{},FM2)[0] == 404)
check('company admin cannot override while the project has an FM', call('POST',f'expenses/{E1}/approve',{},AD1)[0] == 403)
check('return / reject need a reason', call('POST',f'expenses/{E1}/return',{},FM1)[0] == 400 and call('POST',f'expenses/{E1}/reject',{},FM1)[0] == 400)
before = proj(AD1,'P001')['spent']
s, d = call('POST',f'expenses/{E1}/approve',{},FM1); check('FM approves', s==201 and d['status']=='approved' and [h['step'] for h in d['history']]==['submitted','pm_verified','approved'], (s,d))
check('approved expense now counts as project spend', proj(AD1,'P001')['spent'] == before + 4500, (before, proj(AD1,'P001')['spent']))
check('approved expense cannot be decided again', call('POST',f'expenses/{E1}/reject',{'note':'oops'},FM1)[0] == 409 and call('POST',f'expenses/{E1}/approve',{},FM1)[0] == 409)
check('SE notified of approval', any(x['title']=='Expense approved' for x in call('GET','notifications',token=SE1)[1]))
# FM return -> resubmit -> PM -> FM reject: spend unchanged
s, e2 = call('POST','expenses',{**good,'amount':1200,'description':'Rejected sample cost'},SE1); call('POST',f"expenses/{e2['id']}/receipts",pdf,SE1,headers=hdr)
call('POST',f"expenses/{e2['id']}/verify",{},PM1)
s, d = call('POST',f"expenses/{e2['id']}/return",{'note':'Wrong category'},FM1); check('FM returns expense to the engineer', s==201 and d['status']=='returned', (s,d))
call('PATCH',f"expenses/{e2['id']}",{'category':'Materials'},SE1); call('POST',f"expenses/{e2['id']}/verify",{},PM1)
s, d = call('POST',f"expenses/{e2['id']}/reject",{'note':'Not allowed on this project'},FM1); check('FM rejects', s==201 and d['status']=='rejected', (s,d))
check('rejected expense is not spend', proj(AD1,'P001')['spent'] == before + 4500)
check('PM told about finance decision', any('rejected by finance' in x['message'] for x in call('GET','notifications',token=PM1)[1]))

# ---- 8. budget rules
bc = exp(FM1,E1)[1]['budgetCheck']; check('budget position is shown', all(k in bc for k in ('budget','spent','committed','available','exceedsBudget')) and bc['committed'] >= 76000, bc)
ORIG_BUDGET = bc['budget']
# petty claims are capped at INR 10,000, so the budget limits are exercised by lowering the project budget for a moment
call('PATCH','projects/P001',{'budget': round(bc['spent'] + 5000, 2)},AD1)
s, over = call('POST','expenses',{**good,'amount':6000,'description':'Way over budget'},SE1); call('POST',f"expenses/{over['id']}/receipts",pdf,SE1,headers=hdr); call('POST',f"expenses/{over['id']}/verify",{},PM1)
check('hard limit: spend can never exceed the project budget', (lambda r: r[0]==400 and 'above the project budget' in msg(r))(call('POST',f"expenses/{over['id']}/approve",{'note':'please'},FM1)))
call('POST',f"expenses/{over['id']}/reject",{'note':'Over budget'},FM1)
bc2 = exp(FM1,E1)[1]['budgetCheck']
call('PATCH','projects/P001',{'budget': round(bc2['spent'] + bc2['committed'] + 8000, 2)},AD1)
s, so = call('POST','expenses',{**good,'amount':9000,'description':'Eats into PO commitments'},SE1); call('POST',f"expenses/{so['id']}/receipts",pdf,SE1,headers=hdr); call('POST',f"expenses/{so['id']}/verify",{},PM1)
check('soft limit: beyond what purchase orders leave needs a written reason', (lambda r: r[0]==400 and 'Add a note' in msg(r))(call('POST',f"expenses/{so['id']}/approve",{},FM1)))
s, d = call('POST',f"expenses/{so['id']}/approve",{'note':'Approved by the owner, budget to be revised'},FM1); check('approved with a note', s==201 and d['status']=='approved', (s,d))
call('PATCH','projects/P001',{'budget': ORIG_BUDGET},AD1)
check('petty cap: a claim above INR 10,000 is refused', (lambda r: r[0]==400 and '10,000' in msg(r))(call('POST','expenses',{**good,'amount':10001,'description':'Bulk cement from a shop'},SE1)))
check('milestone is required on a project with milestones', call('POST','expenses',{k:v for k,v in good.items() if k!='milestoneId'},SE1)[0] == 400)
check('a milestone of another project is refused', call('POST','expenses',{**good,'milestoneId':'MS003'},SE1)[0] == 400)

# ---- 9. reimbursement (separate from approval)
check('only approved expenses can be reimbursed', call('POST',f"expenses/{e2['id']}/reimburse",{},FM1)[0] == 409)
check('PM / SE cannot reimburse', call('POST',f'expenses/{E1}/reimburse',{},PM1)[0] == 403 and call('POST',f'expenses/{E1}/reimburse',{},SE1)[0] == 403)
s, d = call('POST',f'expenses/{E1}/reimburse',{'reference':'UPI-88213'},FM1); check('FM records reimbursement', s==201 and d['reimbursement']['reference']=='UPI-88213' and d['history'][-1]['step']=='reimbursed' and d['status']=='approved', (s,d))
check('reimbursing twice is refused', call('POST',f'expenses/{E1}/reimburse',{},FM1)[0] == 409)
check('SE notified of reimbursement', any(x['title']=='Expense reimbursed' for x in call('GET','notifications',token=SE1)[1]))
check('reimbursement does not change spend', proj(AD1,'P001')['spent'] == before + 4500 + 9000)

# ---- 10. withdraw
s, w = call('POST','expenses',{**good,'amount':77,'description':'Small tea expense'},SE1)
check("others cannot withdraw", call('POST',f"expenses/{w['id']}/withdraw",token=SE2)[0] in (403,404))
s, d = call('POST',f"expenses/{w['id']}/withdraw",token=SE1); check('SE withdraws own submitted claim', s==201 and d['status']=='cancelled', (s,d))
check('withdrawn claim is final', call('POST',f"expenses/{w['id']}/verify",{},PM1)[0] == 409)

# ---- 11. bills: client decision (no tampering), payments, outstanding
b1 = call('GET','bills/B001',token=C1)[1]; check('seed bill B001 pending', b1['status']=='Pending Decision' and b1['paymentStatus']=='n/a' and b1['outstanding']==4500000, b1)
b2 = call('GET','bills/B002',token=C2)[1]; check('seed bill B002 partly paid (3,000,000 of 2,26,80,000)', b2['paidAmount']==3000000 and b2['outstanding']==19680000 and b2['paymentStatus']=='Partially Paid', b2)
b3 = call('GET','bills/B003',token=C3)[1]; check('seed bill B003 fully paid', b3['paymentStatus']=='Paid' and b3['outstanding']==0, b3)
check('payments of a bill are visible to its client and company only', len(call('GET','bills/B002/payments',token=C2)[1])==1 and call('GET','bills/B002/payments',token=C1)[0]==404 and call('GET','bills/B002/payments',token=AD2)[0]==404)
check('cannot pay a bill that is not accepted', (lambda r: r[0]==400 and 'not accepted' in msg(r))(call('POST','bills/B001/payments',{'amount':1000},C1)))
s, d = call('PATCH','bills/B001',{'status':'Pending Decision'},C1); check('a decision must be accept or decline', s == 400, (s,d))
s, d = call('PATCH','bills/B001',{'amount':1,'milestone':'hacked'},C1); check('client cannot edit anything but the decision', s == 400, (s,d))
check('FM / PM / admin cannot decide for the client', call('PATCH','bills/B001',{'status':'Accepted'},FM1)[0] == 403 and call('PATCH','bills/B001',{'status':'Accepted'},AD1)[0] == 403)
check("other client cannot decide", call('PATCH','bills/B001',{'status':'Accepted'},C2)[0] in (403,404))
s, d = call('PATCH','bills/B001',{'status':'Accepted','amount':1,'paidAmount':999999999,'decisionDate':'2000-01-01'},C1)
check('client accepts; extra fields are ignored and the decision date is set by the server', s==200 and d['status']=='Accepted' and d['amount']==4500000 and d['paidAmount']==0 and d['decisionDate']==iso(TODAY) and d['paymentStatus']=='Unpaid' and d['outstanding']==4500000, (s,d))
check('a decided bill cannot be changed again', call('PATCH','bills/B001',{'status':'Declined'},C1)[0] == 409)
s, d = call('POST','bills/B001/payments',{'amount':5000000},C1); check('cannot pay more than outstanding', s==400 and 'more than the outstanding' in json.dumps(d), (s,d))
check('amount must be positive', call('POST','bills/B001/payments',{'amount':0},C1)[0] == 400 and call('POST','bills/B001/payments',{'amount':-5},C1)[0] == 400)
check('other client cannot pay my bill', call('POST','bills/B001/payments',{'amount':1000},C2)[0] == 404)
s, d = call('POST','bills/B001/payments',{'amount':1500000,'method':'Cash','reference':'x'},C1)
check('client demo payment (partial): method and reference are generated', s==201 and d['payment']['method']=='Online payment (demo)' and d['payment']['reference'].startswith('DEMO-') and d['bill']['paymentStatus']=='Partially Paid' and d['bill']['outstanding']==3000000, (s,d))
check('FM notified of client payment', any(x['title']=='Payment received' for x in call('GET','notifications',token=FM1)[1]))
# finance records an offline payment
check('PM cannot record payments', call('POST','bills/B001/payments',{'amount':1000},PM1)[0] == 403)
check("other company's FM cannot", call('POST','bills/B001/payments',{'amount':1000,'method':'Cash'},FM2)[0] == 404)
check('company admin cannot while the project has an FM', call('POST','bills/B001/payments',{'amount':1000,'method':'Cash'},AD1)[0] == 403)
check('unknown method rejected', call('POST','bills/B001/payments',{'amount':1000,'method':'Bitcoin','reference':'abc'},FM1)[0] == 400)
check('bank transfer needs a reference', call('POST','bills/B001/payments',{'amount':1000,'method':'Bank transfer'},FM1)[0] == 400)
check('future payment date rejected', call('POST','bills/B001/payments',{'amount':1000,'method':'Cash','paidAt':iso(TODAY+datetime.timedelta(days=3))},FM1)[0] == 400)
s, d = call('POST','bills/B001/payments',{'amount':1000000,'method':'Bank transfer','reference':'NEFT-1234','paidAt':iso(TODAY)},FM1); check('FM records a bank transfer', s==201 and d['payment']['channel']=='finance' and d['bill']['outstanding']==2000000, (s,d))
s, d = call('POST','bills/B001/payments',{'amount':2000000,'method':'Cheque','reference':'CHQ-77'},FM1); check('final payment closes the bill', s==201 and d['bill']['paymentStatus']=='Paid' and d['bill']['outstanding']==0, (s,d))
check('client notified of FM-recorded payment', any(x['title']=='Payment recorded' for x in call('GET','notifications',token=C1)[1]))
check('nothing more can be paid', call('POST','bills/B001/payments',{'amount':1},C1)[0] == 400)
check('payments are listed newest first', [p['id'] for p in call('GET','bills/B001/payments',token=FM1)[1]][0] > [p['id'] for p in call('GET','bills/B001/payments',token=FM1)[1]][-1])
check('paid bill cannot be edited or deleted', call('PATCH','bills/B001',{'amount':1},FM1)[0] in (403,409) and call('DELETE','bills/B001',token=FM1)[0] == 409)
s, d = call('PATCH','bills/B004',{'status':'Declined','rejectionReason':'Wrong quantities'},C3); check('client declines a bill with a reason', s==200 and d['status']=='Declined' and d['rejectionReason']=='Wrong quantities', (s,d))
check('declined bill cannot be paid', (lambda r: r[0]==400 and 'declined' in msg(r))(call('POST','bills/B004/payments',{'amount':1000},C3)))
allp = call('GET','payments',token=C1)[1]; check('client sees only own payments', allp and all(p['clientId']=='U005' for p in allp), allp)
check('FM sees payments of own projects; other company sees none of ours', all(p['companyId']=='COMP001' for p in call('GET','payments',token=FM1)[1]) and all(p['companyId']=='COMP002' for p in call('GET','payments',token=FM2)[1]))
check('procurement / site engineer have no access to payments', call('GET','payments',token=PR1)[0] == 403 and call('GET','payments',token=SE1)[0] == 403)

# ---- 12. dashboards
check('site engineers have no dashboard endpoint', call('GET','dashboard',token=SE1)[0] == 403 and call('GET','dashboard',token=PR1)[0] == 403)
cd = call('GET','dashboard',token=C1)[1]; mybills = [b for b in call('GET','bills',token=C1)[1]]
check('client dashboard: billing totals match the bills', cd['role']=='client' and cd['totals']['billed']==sum(b['amount'] for b in mybills if b['status']!='Declined') and cd['totals']['paid']==4500000+3125000 and cd['totals']['outstanding']==0 and cd['totals']['pendingBills']==0, cd['totals'])
check("client dashboard hides the contractor's costs", all('spent' not in p and 'budget' not in p for p in cd['projects']), cd['projects'][0])
check('client dashboard: progress + requirements', cd['projects'][0]['progress']==call('GET','projects/P001',token=C1)[1]['progress'] and cd['requirements']['open']==len([r for r in call('GET','requirements',token=C1)[1] if r['status']=='open']), cd['requirements'])
pmd = call('GET','dashboard',token=PM1)[1]; allexp = call('GET','expenses',token=PM1)[1]
check('PM dashboard: pending counts are real', pmd['pending']['expensesToVerify']==len([e for e in allexp if e['status']=='submitted']) and pmd['pending']['materialRequests']==len([r for r in call('GET','material-requests',token=PM1)[1] if r['status']=='submitted']), pmd['pending'])
check('PM dashboard: project rows carry progress, budget and spend', all(k in pmd['projects'][0] for k in ('progress','milestoneCompletion','budget','spent','committed','available','openTasks')), pmd['projects'][0])
fmd = call('GET','dashboard',token=FM1)[1]; fmp = [call('GET',f'projects/{p["id"]}',token=FM1)[1] for p in fmd['projects']]
check('FM dashboard: budget vs spent matches the projects', fmd['budget']['total']==sum(p['budget'] for p in fmp) and fmd['budget']['spent']==sum(p['spent'] for p in fmp) and fmd['budget']['available']==fmd['budget']['total']-fmd['budget']['spent']-fmd['budget']['committed'], (fmd['budget'], [(p['budget'],p['spent']) for p in fmp]))
check('FM dashboard: approvals pending are real', fmd['pending']['expensesToApprove']==len([e for e in call('GET','expenses',token=FM1)[1] if e['status']=='pm_verified']) and fmd['pending']['purchaseOrdersToApprove']==len([p for p in call('GET','purchase-orders',token=FM1)[1] if p['status']=='pending_approval']), fmd['pending'])
check('FM dashboard: receivables (B002 outstanding 1.968 Cr is overdue)', fmd['receivables']['outstanding']==19680000 and fmd['receivables']['overdue']==19680000 and fmd['receivables']['paid']==3000000+4500000+3125000+5040000, fmd['receivables'])
check('FM dashboard: reimbursements pending counts only workflow expenses', fmd['pending']['reimbursements']==len([e for e in call('GET','expenses',token=FM1)[1] if e['status']=='approved' and not e.get('reimbursement') and 'recorded' not in [h['step'] for h in e['history']]]), fmd['pending'])
add = call('GET','dashboard',token=AD1)[1]; check('company admin dashboard', add['totals']['projects']==2 and add['totals']['teamMembers']>=5 and 'receivables' in add and add['budget']['total']==fmd['budget']['total'], add['totals'])
sud = call('GET','dashboard',token=SU)[1]; allreq = call('GET','requirements',token=SU)[1]
check('platform dashboard: marketplace and companies', sud['companies']['total']==2 and sud['marketplace']['openRequirements']==len([r for r in allreq if r['status']=='open']) and sud['projects']['total']==4, sud)
fm2 = call('GET','dashboard',token=FM2)[1]; check('other company numbers never leak', all(p['id'] in ('P003','P004') for p in fm2['projects']), fm2['projects'])
print('PHASE1 ALL PASS' if ok else 'PHASE1 SOME FAILED')
sys.exit(0 if ok else 1)
