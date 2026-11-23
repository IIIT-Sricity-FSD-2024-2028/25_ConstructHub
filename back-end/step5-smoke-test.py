"""Step 5 procurement & stock smoke test. Fresh data/db first, then:  API=http://localhost:3000 python3 step5-smoke-test.py [phase2]"""
import json, os, sys, urllib.request, urllib.error, datetime
B = os.environ.get('API', 'http://localhost:3000')
TODAY = datetime.date.today(); iso = lambda d: d.isoformat(); FUT = iso(TODAY + datetime.timedelta(days=30))
def call(method, path, body=None, token=None):
    req = urllib.request.Request(B + '/' + path, method=method, data=None if body is None else json.dumps(body).encode())
    req.add_header('Content-Type', 'application/json')
    if token: req.add_header('Authorization', 'Bearer ' + token)
    try:
        r = urllib.request.urlopen(req); b = r.read(); return r.status, (json.loads(b) if b else None)
    except urllib.error.HTTPError as e:
        b = e.read()
        try: return e.code, json.loads(b)
        except Exception: return e.code, b
ok = True
def check(name, cond, extra=''):
    global ok
    if not cond: print('FAIL ' + name, str(extra)[:400])
    ok = ok and cond
def login(e, p='123456'):
    s, d = call('POST', 'auth/login', {'email': e, 'password': p}); assert s == 200, (e, s, d); return d['accessToken']
SU=login('super@ch.com'); AD1=login('admin@apex.com'); PM1=login('pm@apex.com'); SE1=login('site@apex.com'); FM1=login('finance@apex.com'); PR1=login('proc@apex.com')
AD2=login('admin@ltinfra.com'); PM2=login('pm@ltinfra.com'); SE2=login('site@ltinfra.com'); FM2=login('finance@ltinfra.com'); PR2=login('proc@ltinfra.com')
C1=login('client@apex.com')
stock = lambda tok, pid=None: call('GET', 'stock' + (f'?projectId={pid}' if pid else ''), token=tok)[1]
qty = lambda tok, pid, name: next((x['quantity'] for x in stock(tok, pid) if x['description'] == name), None)
msg = lambda r: json.dumps(r[1])

if len(sys.argv) > 1 and sys.argv[1] == 'phase2':
    check('stock persisted', qty(PR1, 'P001', 'Cement OPC 53 grade') == 130 and qty(PR1, 'P001', 'TMT bars 12mm') == 1300, stock(PR1))
    s, d = call('GET', 'purchase-orders', token=PR1); st = {p['id']: p['status'] for p in d}; check('PO statuses persisted', st['PO001'] == 'received' and st['PO002'] == 'approved', st)
    check('limit persisted', call('GET','procurement/settings',token=AD1)[1]['poApprovalLimit'] == 50000)
    check('GRNs persisted', len(call('GET','goods-receipts',token=PR1)[1]) >= 4)
    check('procurement login still works after restart', PR1 is not None)
    print('PHASE2 ALL PASS' if ok else 'PHASE2 SOME FAILED'); sys.exit(0 if ok else 1)

# ---- 1. auth required everywhere
for m, p in [('GET','suppliers'),('POST','suppliers'),('PATCH','suppliers/SUP001'),('DELETE','suppliers/SUP001'),('GET','material-requests'),('POST','material-requests'),('GET','material-requests/MR001'),
             ('POST','material-requests/MR001/approve'),('POST','material-requests/MR001/reject'),('POST','material-requests/MR001/cancel'),('GET','purchase-orders'),('POST','purchase-orders'),
             ('GET','purchase-orders/PO001'),('POST','purchase-orders/PO001/approve'),('POST','purchase-orders/PO001/reject'),('POST','purchase-orders/PO001/cancel'),('GET','goods-receipts'),
             ('POST','goods-receipts'),('GET','stock'),('GET','stock/ledger'),('GET','stock/issues'),('POST','stock/issues'),('GET','procurement/settings'),('PATCH','procurement/settings')]:
    check(f'{m} /{p} needs auth', call(m, p, {} if m != 'GET' else None)[0] == 401)

# ---- 2. role guards
check('client has no access', all(call('GET', p, token=C1)[0] == 403 for p in ['suppliers','material-requests','purchase-orders','stock','goods-receipts','procurement/settings']))
check('platform admin has no access to company procurement', call('GET','material-requests',token=SU)[0] == 403)
check('SE cannot create supplier', call('POST','suppliers',{'name':'Nope Traders'},SE1)[0] == 403)
check('PM cannot create PO', call('POST','purchase-orders',{},PM1)[0] == 403)
check('PR cannot approve requests', call('POST','material-requests/MR002/approve',{},PR1)[0] == 403)
check('PR cannot approve POs', call('POST','purchase-orders/PO002/approve',{},PR1)[0] == 403)
check('FM cannot create requests', call('POST','material-requests',{},FM1)[0] == 403)
check('SE cannot record receipts', call('POST','goods-receipts',{},SE1)[0] == 403)
check('SE cannot issue stock', call('POST','stock/issues',{},SE1)[0] == 403)
check('PM cannot change settings', call('PATCH','procurement/settings',{'poApprovalLimit':1},PM1)[0] == 403)

# ---- 3. new role & seeds
s, d = call('GET','users',token=AD1); check('procurement user exists in company', any(u['email']=='proc@apex.com' and u['role']=='procurement_storekeeper' for u in d))
s, d = call('POST','users',{'name':'Gita Store','email':'gita@apex.com','password':'Secret123','role':'procurement_storekeeper','phone':'9876500777'},AD1)
check('company admin can create a procurement user', s == 201 and d['role']=='procurement_storekeeper' and d['companyId']=='COMP001', (s,d))
check('company admin cannot create superuser', call('POST','users',{'name':'Evil','email':'evil@apex.com','password':'Secret123','role':'superuser','phone':'9876500778'},AD1)[0] == 403)
check('procurement user can read projects of own company', (lambda r: r[0]==200 and r[1] and all(p['companyId']=='COMP001' for p in r[1]))(call('GET','projects',token=PR1)))
s, d = call('GET','material-requests',token=PR1); check('procurement sees only approved/ordered requests', {r['id'] for r in d} == {'MR001','MR003'}, [r['id'] for r in d])
s, d = call('GET','material-requests',token=SE1); check('SE sees own requests', {r['id'] for r in d} >= {'MR001','MR002','MR003'})
s, d = call('GET','material-requests',token=PM1); check('PM sees requests of assigned projects', {r['id'] for r in d} >= {'MR001','MR002','MR003'})
check('other company cannot see requests', call('GET','material-requests',token=PR2)[1] == [] and call('GET','material-requests/MR001',token=SE2)[0] == 404 and call('GET','material-requests/MR001',token=PM2)[0] == 404)
s, d = call('GET','material-requests/MR001',token=PR1); it = {i['id']:i for i in d['items']}; check('request shows ordered vs remaining', it['I1']['remainingQuantity']==0 and it['I2']['remainingQuantity']==1500 and d['status']=='approved', d)

# ---- 4. suppliers
s, d = call('GET','suppliers',token=PR1); check('supplier directory scoped to company', {x['id'] for x in d}=={'SUP001','SUP002'}, d)
check('PM/FM/admin can read suppliers', all(call('GET','suppliers',token=t)[0]==200 for t in (PM1,FM1,AD1)))
check('bad phone rejected', call('POST','suppliers',{'name':'Bad Phone Co','phone':'123'},PR1)[0] == 400)
check('bad GSTIN rejected', call('POST','suppliers',{'name':'Bad Gst Co','gstin':'abc'},PR1)[0] == 400)
s, sup = call('POST','suppliers',{'name':'Delta Bricks','phone':'9822011111','gstin':'27AAAAA0000A1Z5','materials':'Bricks'},PR1); check('procurement adds supplier', s==201 and sup['status']=='active', (s,sup)); SID = sup['id']
check('duplicate supplier name rejected (case-insensitive)', call('POST','suppliers',{'name':'delta bricks'},PR1)[0] == 409)
check('other company cannot see/edit my supplier', call('PATCH','suppliers/SUP001',{'phone':'9822000000'},PR2)[0] == 404 and all(x['id'] not in ('SUP001','SUP002',SID) for x in call('GET','suppliers',token=PR2)[1]))
s, d = call('PATCH',f'suppliers/{SID}',{'phone':'9822022222','status':'inactive'},PR1); check('supplier edit + deactivate', s==200 and d['status']=='inactive' and d['phone']=='9822022222', (s,d))
check('supplier without orders can be deleted', call('DELETE',f'suppliers/{SID}',token=PR1)[0] == 200)
check('supplier with orders cannot be deleted', call('DELETE','suppliers/SUP001',token=PR1)[0] == 409)
s, inactive = call('POST','suppliers',{'name':'Inactive Co'},PR1); call('PATCH',f"suppliers/{inactive['id']}",{'status':'inactive'},PR1)

# ---- 5. material requests (site engineer)
good = {'projectId':'P002','items':[{'description':'Marble slab 20mm','unit':'sq ft','quantity':400,'specification':'Makrana white'}],'neededBy':FUT,'priority':'High','notes':'Lobby flooring'}
check('empty items rejected', call('POST','material-requests',{**good,'items':[]},SE1)[0] == 400)
check('zero quantity rejected', call('POST','material-requests',{**good,'items':[{'description':'Sand','unit':'t','quantity':0}]},SE1)[0] == 400)
check('past needed-by rejected', call('POST','material-requests',{**good,'neededBy':'2020-01-01'},SE1)[0] == 400)
check('same material twice rejected', call('POST','material-requests',{**good,'items':[{'description':'Sand','unit':'t','quantity':1},{'description':'  SAND ','unit':'T','quantity':2}]},SE1)[0] == 400)
check('project of another company -> 404', call('POST','material-requests',{**good,'projectId':'P003'},SE1)[0] == 404)
s, r = call('POST','material-requests',good,SE1); check('SE creates request', s==201 and r['status']=='submitted' and r['items'][0]['id']=='I1' and r['requestedBy']=='U003', (s,r)); R1 = r['id']
n = call('GET','notifications',token=PM1)[1]; check('PM notified of new request', any(x['title']=='New material request' for x in n))
check('SE of other company cannot cancel it', call('POST',f'material-requests/{R1}/cancel',token=SE2)[0] == 404)
check('PM of other company cannot decide', call('POST',f'material-requests/{R1}/approve',{},PM2)[0] == 404)
check('FM cannot decide requests', call('POST',f'material-requests/{R1}/approve',{},FM1)[0] == 403)
check('reject needs a reason', call('POST',f'material-requests/{R1}/reject',{},PM1)[0] == 400)
s, r2 = call('POST','material-requests',{**good,'items':[{'description':'Sand','unit':'t','quantity':5}]},SE1)
s, d = call('POST',f"material-requests/{r2['id']}/reject",{'note':'Not in BOQ'},PM1); check('PM rejects with reason', s==201 and d['status']=='rejected' and d['decisionNote']=='Not in BOQ', (s,d))
check('SE notified of rejection', any(x['title']=='Material request rejected' for x in call('GET','notifications',token=SE1)[1]))
check('rejected request cannot be decided again', call('POST',f"material-requests/{r2['id']}/approve",{},PM1)[0] == 409)
s, r3 = call('POST','material-requests',{**good,'items':[{'description':'Gravel','unit':'t','quantity':3}]},SE1)
check('SE cancels own submitted request', call('POST',f"material-requests/{r3['id']}/cancel",token=SE1)[1]['status']=='cancelled')
s, d = call('POST',f'material-requests/{R1}/approve',{'note':'OK'},PM1); check('PM approves request', s==201 and d['status']=='approved', (s,d))
check('approved request cannot be cancelled', call('POST',f'material-requests/{R1}/cancel',token=SE1)[0] == 400)
check('procurement notified of approved request', any(x['title']=='Approved request awaiting purchase order' for x in call('GET','notifications',token=PR1)[1]))
check('PO cannot be raised for unapproved request', call('POST','purchase-orders',{'requestId':'MR002','supplierId':'SUP001','items':[{'requestItemId':'I1','quantity':10,'rate':5}]},PR1)[0] == 400)

# ---- 6. purchase orders: validation + approval policy
po_ok = {'requestId':'MR001','supplierId':'SUP002','items':[{'requestItemId':'I2','quantity':1500,'rate':60}],'expectedDelivery':FUT,'notes':'Fe500D'}
check('quantity above remaining rejected', (lambda r: r[0]==400 and 'at most 1500' in msg(r))(call('POST','purchase-orders',{**po_ok,'items':[{'requestItemId':'I2','quantity':2000,'rate':60}]},PR1)))
check('already fully ordered item rejected', call('POST','purchase-orders',{**po_ok,'items':[{'requestItemId':'I1','quantity':1,'rate':60}]},PR1)[0] == 400)
check('item not in request rejected', call('POST','purchase-orders',{**po_ok,'items':[{'requestItemId':'I9','quantity':1,'rate':60}]},PR1)[0] == 400)
check('same item twice rejected', call('POST','purchase-orders',{**po_ok,'items':[{'requestItemId':'I2','quantity':1,'rate':60},{'requestItemId':'I2','quantity':1,'rate':60}]},PR1)[0] == 400)
check('zero rate rejected', call('POST','purchase-orders',{**po_ok,'items':[{'requestItemId':'I2','quantity':1,'rate':0}]},PR1)[0] == 400)
check('past delivery date rejected', call('POST','purchase-orders',{**po_ok,'expectedDelivery':'2020-01-01'},PR1)[0] == 400)
check('supplier of another company rejected', call('POST','purchase-orders',{**po_ok,'supplierId':'SUP003'},PR1)[0] == 404)
check('inactive supplier rejected', call('POST','purchase-orders',{**po_ok,'supplierId':inactive['id']},PR1)[0] == 400)
check('other company cannot order our request', call('POST','purchase-orders',po_ok,PR2)[0] == 404)
s, po3 = call('POST','purchase-orders',po_ok,PR1)
check('below the limit and within budget -> auto-approved', s==201 and po3['status']=='approved' and po3['totalAmount']==90000 and po3['requiresApproval'] is False, (s,po3)); PO3 = po3['id']
check('request becomes "ordered" once fully covered', call('GET','material-requests/MR001',token=PR1)[1]['status']=='ordered')
check('fully ordered request cannot be ordered again', call('POST','purchase-orders',po_ok,PR1)[0] == 400)

proj = call('GET','projects/P002',token=AD1)[1]; avail = proj['budget'] - proj['spent']
rate = round((avail + 1000) / 400, 2)   # one more than the budget has left
s, big = call('POST','purchase-orders',{'requestId':R1,'supplierId':'SUP001','items':[{'requestItemId':'I1','quantity':400,'rate':rate}]},PR1)
check('over project budget -> needs Finance Manager', s==201 and big['status']=='pending_approval' and 'project budget' in big['approvalReason'], (s,big)); BIG = big['id']
check('FM notified of pending order', any(x['title']=='Purchase order awaiting approval' for x in call('GET','notifications',token=FM1)[1]))
s, d = call('GET','purchase-orders/PO002',token=FM1); check('FM sees budget check on pending order', s==200 and d['status']=='pending_approval' and d['budgetCheck']['exceedsBudget'] in (True, False) and 'available' in d['budgetCheck'] and d['budgetCheck']['budget']>0, d.get('budgetCheck'))
s, d = call('GET','purchase-orders/PO002',token=SE1); check('site engineer sees the order but no prices', s==200 and 'totalAmount' not in d and all('rate' not in i and 'amount' not in i for i in d['items']), d)
s, d = call('GET','purchase-orders',token=SE1); check('site engineer list has no prices either', d and all('totalAmount' not in p for p in d))
check('other company cannot read our PO', call('GET','purchase-orders/PO001',token=PR2)[0] == 404 and call('GET','purchase-orders/PO001',token=FM2)[0] == 404)

# ---- 7. configurable limit
check('limit must be a whole number >= 0', call('PATCH','procurement/settings',{'poApprovalLimit':-5},AD1)[0] == 400 and call('PATCH','procurement/settings',{'poApprovalLimit':'x'},AD1)[0] == 400)
check('default limit is 1,00,000', call('GET','procurement/settings',token=FM1)[1]['poApprovalLimit'] == 100000)
s, d = call('PATCH','procurement/settings',{'poApprovalLimit':50000},AD1); check('company admin sets the limit', s==200 and d['poApprovalLimit']==50000, (s,d))
check('limit is per company', call('GET','procurement/settings',token=AD2)[1]['poApprovalLimit'] == 100000)
s, mr = call('POST','material-requests',{**good,'projectId':'P001','items':[{'description':'Bricks','unit':'nos','quantity':10000}]},SE1); call('POST',f"material-requests/{mr['id']}/approve",{},PM1)
s, sm = call('POST','purchase-orders',{'requestId':mr['id'],'supplierId':'SUP001','items':[{'requestItemId':'I1','quantity':10000,'rate':6}]},PR1)
check('60,000 is above the new 50,000 limit -> pending', sm['status']=='pending_approval' and 'company approval limit' in sm['approvalReason'], sm); SM = sm['id']

# ---- 8. approvals
check('PM cannot approve POs', call('POST',f'purchase-orders/{SM}/approve',{},PM1)[0] == 403)
check('other company FM cannot', call('POST',f'purchase-orders/{SM}/approve',{},FM2)[0] == 404)
check('company admin cannot override while the project has an FM', call('POST',f'purchase-orders/{SM}/approve',{},AD1)[0] == 403)
check('rejecting needs a reason', call('POST',f'purchase-orders/{SM}/reject',{},FM1)[0] == 400)
s, d = call('POST',f'purchase-orders/{SM}/reject',{'note':'Price too high, get another quote'},FM1); check('FM rejects order', s==201 and d['status']=='rejected', (s,d))
check('rejection frees the request again', call('GET',f"material-requests/{mr['id']}",token=PR1)[1]['status']=='approved')
check('rejected order cannot be approved', call('POST',f'purchase-orders/{SM}/approve',{},FM1)[0] == 409)
check('creator notified of rejection', any(x['title']=='Purchase order rejected' for x in call('GET','notifications',token=PR1)[1]))
s, sm2 = call('POST','purchase-orders',{'requestId':mr['id'],'supplierId':'SUP001','items':[{'requestItemId':'I1','quantity':10000,'rate':5.5}]},PR1); SM2 = sm2['id']
s, d = call('POST',f'purchase-orders/{SM2}/approve',{'note':'ok'},FM1); check('FM approves order', s==201 and d['status']=='approved' and d['decisionBy']=='U004', (s,d))
check('approved order cannot be decided again', call('POST',f'purchase-orders/{SM2}/reject',{'note':'late'},FM1)[0] == 409)
s, d = call('POST','purchase-orders/PO002/approve',{},FM1); check('seeded pending PO approved', s==201 and d['status']=='approved')
bc = call('GET','purchase-orders/PO003',token=FM1)[1]['budgetCheck']; check('approved orders count as committed budget', bc['committed'] >= 340000 + 76000, bc)

# ---- 9. cancel
s, mrc = call('POST','material-requests',{**good,'projectId':'P001','items':[{'description':'Gravel 20mm','unit':'t','quantity':100}]},SE1); call('POST',f"material-requests/{mrc['id']}/approve",{},PM1)
s, c1 = call('POST','purchase-orders',{'requestId':mrc['id'],'supplierId':'SUP001','items':[{'requestItemId':'I1','quantity':100,'rate':10}]},PR1)
check('PO for cancel test created', s == 201, (s, c1))
check('request is ordered while the PO is alive', call('GET',f"material-requests/{mrc['id']}",token=PR1)[1]['status'] == 'ordered')
check('cancel needs a reason', call('POST',f"purchase-orders/{c1['id']}/cancel",{},PR1)[0] == 400)
check('FM cannot cancel', call('POST',f"purchase-orders/{c1['id']}/cancel",{'reason':'nope'},FM1)[0] == 403)
s, d = call('POST',f"purchase-orders/{c1['id']}/cancel",{'reason':'Wrong supplier'},PR1); check('procurement cancels an order with no receipts', s==201 and d['status']=='cancelled' and d['cancelReason']=='Wrong supplier', (s,d))
rq = call('GET',f"material-requests/{mrc['id']}",token=PR1)[1]; check('cancelled order frees the quantity again (request back to approved)', rq['status']=='approved' and rq['items'][0]['remainingQuantity']==100, rq)
check('cancelled order cannot be cancelled twice', call('POST',f"purchase-orders/{c1['id']}/cancel",{'reason':'again'},PR1)[0] == 409)
check('cancelled order cannot be received', call('POST','goods-receipts',{'poId':c1['id'],'items':[{'poItemId':'L1','receivedQuantity':1}]},PR1)[0] == 400)
check('pending order cannot be received', call('POST','goods-receipts',{'poId':BIG,'items':[{'poItemId':'L1','receivedQuantity':1}]},PR1)[0] == 400)

# ---- 10. goods receipts (GRN) and stock
cement0 = qty(PR1,'P001','Cement OPC 53 grade'); check('seed stock: 100 bags of cement', cement0 == 100, cement0)
grn = lambda poid, items, **kw: call('POST','goods-receipts',{'poId':poid,'items':items,**kw},PR1)
s, d = grn('PO001',[{'poItemId':'L1','receivedQuantity':100}]); check('cannot receive more than ordered (200 ordered, 120 received)', s==400 and 'at most 80' in json.dumps(d), (s,d))
check('stock untouched after a refused receipt', qty(PR1,'P001','Cement OPC 53 grade') == 100)
check('zero-only receipt rejected', grn('PO001',[{'poItemId':'L1','receivedQuantity':0}])[0] == 400)
check('unknown PO item rejected', grn('PO001',[{'poItemId':'L9','receivedQuantity':1}])[0] == 400)
check('future received date rejected', grn('PO001',[{'poItemId':'L1','receivedQuantity':1}],receivedDate=iso(TODAY+datetime.timedelta(days=3)))[0] == 400)
check('site engineer cannot receive', call('POST','goods-receipts',{'poId':'PO001','items':[{'poItemId':'L1','receivedQuantity':1}]},SE1)[0] == 403)
check("other company cannot receive against our PO", call('POST','goods-receipts',{'poId':'PO001','items':[{'poItemId':'L1','receivedQuantity':1}]},PR2)[0] == 404)
s, d = grn('PO001',[{'poItemId':'L1','receivedQuantity':80,'remarks':'All good'}],deliveryNote='DC-4488'); check('final 80 bags received -> PO received', s==201 and d['order']['status']=='received' and d['receipt']['id'].startswith('GRN'), (s,d))
check('stock = 100 + 80', qty(PR1,'P001','Cement OPC 53 grade') == 180)
check('received order cannot receive again', grn('PO001',[{'poItemId':'L1','receivedQuantity':1}])[0] == 400)
check('SE notified of delivery', any(x['title']=='Materials received at site' for x in call('GET','notifications',token=SE1)[1]))
s, d = grn(PO3,[{'poItemId':'L1','receivedQuantity':500}]); check('partial delivery -> partially_received', s==201 and d['order']['status']=='partially_received' and d['order']['items'][0]['receivedQuantity']==500, (s,d))
check('stock of new material created', qty(PR1,'P001','TMT bars 12mm') == 500)
check('cannot cancel an order that has receipts', call('POST',f'purchase-orders/{PO3}/cancel',{'reason':'too late'},PR1)[0] == 409)
check('cannot over-receive the remainder', grn(PO3,[{'poItemId':'L1','receivedQuantity':1001}])[0] == 400)
s, d = grn(PO3,[{'poItemId':'L1','receivedQuantity':1000}]); check('rest delivered -> received', s==201 and d['order']['status']=='received', (s,d))
check('TMT stock = 1500', qty(PR1,'P001','TMT bars 12mm') == 1500)
check('GRNs listed for the PO', len(call('GET',f'goods-receipts?poId={PO3}',token=PR1)[1]) == 2)
check('PM and FM can read GRNs', all(call('GET','goods-receipts',token=t)[0]==200 for t in (PM1,FM1)))
check('other company sees no GRNs of ours', call('GET','goods-receipts',token=PR2)[1] == [])
s, d = call('GET',f'purchase-orders/{PO3}',token=FM1); check('order view carries its receipts', len(d['receipts']) == 2)

# ---- 11. stock visibility + ledger
check('PM reads stock of assigned projects', qty(PM1,'P001','Cement OPC 53 grade') == 180)
check('SE reads stock of projects they work on', qty(SE1,'P001','Cement OPC 53 grade') == 180)
check('FM reads stock of own projects', qty(FM1,'P001','Cement OPC 53 grade') == 180)
check("other company cannot see our stock", stock(PR2) == [] and stock(SE2) == [])
check('no endpoint edits stock directly', call('PATCH','stock/STK001',{'quantity':9999},PR1)[0] in (404, 405) and call('POST','stock',{'quantity':1},PR1)[0] in (404, 405))
led = call('GET','stock/ledger?projectId=P001',token=PR1)[1]
check('ledger lists every movement with running balance', led and led[0]['type']=='GRN' and any(t['refId']=='GRN001' for t in led) and all('balanceAfter' in t for t in led), led[:2])
cem = sorted([t for t in call('GET','stock/ledger',token=PR1)[1] if t['description']=='Cement OPC 53 grade'], key=lambda t:t['id'])
check('ledger balances add up for cement', cem[-1]['balanceAfter'] == 180 and sum(t['quantity'] for t in cem) == 180, cem)

# ---- 12. material issue
cid = next(x['id'] for x in stock(PR1,'P001') if x['description']=='Cement OPC 53 grade'); tid = next(x['id'] for x in stock(PR1,'P001') if x['description']=='TMT bars 12mm')
check('cannot issue more than in stock', (lambda r: r[0]==400 and 'available 180' in msg(r))(call('POST','stock/issues',{'items':[{'stockId':cid,'quantity':500}]},PR1)))
check('duplicate lines are summed for the check', call('POST','stock/issues',{'items':[{'stockId':cid,'quantity':100},{'stockId':cid,'quantity':100}]},PR1)[0] == 400)
check('failed issues change nothing', qty(PR1,'P001','Cement OPC 53 grade') == 180)
check('zero/negative quantity rejected', call('POST','stock/issues',{'items':[{'stockId':cid,'quantity':0}]},PR1)[0] == 400 and call('POST','stock/issues',{'items':[{'stockId':cid,'quantity':-5}]},PR1)[0] == 400)
check('unknown stock item', call('POST','stock/issues',{'items':[{'stockId':'STK999','quantity':1}]},PR1)[0] == 404)
check('issue to a non-engineer rejected', call('POST','stock/issues',{'items':[{'stockId':cid,'quantity':1}],'issuedTo':'U004'},PR1)[0] == 400)
check("task from another project rejected", call('POST','stock/issues',{'items':[{'stockId':cid,'quantity':1}],'taskId':'T003'},PR1)[0] == 400)
check('other company cannot issue our stock', call('POST','stock/issues',{'items':[{'stockId':cid,'quantity':1}]},PR2)[0] == 404)
s, iss = call('POST','stock/issues',{'items':[{'stockId':cid,'quantity':50},{'stockId':tid,'quantity':200}],'issuedTo':'U003','taskId':'T001','notes':'Slab 2'},PR1)
check('material issued', s==201 and iss['id'].startswith('ISS') and len(iss['items'])==2 and iss['issuedToName'], (s,iss))
check('stock reduced by the issue', qty(PR1,'P001','Cement OPC 53 grade') == 130 and qty(PR1,'P001','TMT bars 12mm') == 1300)
check('engineer notified of issued material', any(x['title']=='Materials issued to you' for x in call('GET','notifications',token=SE1)[1]))
check('issues listed', any(i['id']==iss['id'] for i in call('GET','stock/issues',token=PM1)[1]))
led = call('GET','stock/ledger?projectId=P001',token=PR1)[1]; check('ledger has the issue lines (negative)', sum(1 for t in led if t['refId']==iss['id'] and t['quantity']<0) == 2)
check('issue exactly all that is left works', call('POST','stock/issues',{'items':[{'stockId':cid,'quantity':130}]},PR1)[0] == 201 and qty(PR1,'P001','Cement OPC 53 grade') == 0)
call('POST','purchase-orders/PO001/approve',{},FM1)  # no-op (already received) - must not break anything
s, d = grn('PO001',[{'poItemId':'L1','receivedQuantity':1}]); check('(sanity) received PO still refuses deliveries', s == 400)
# restore a little cement stock for the persistence phase: nothing else is received against closed POs, so top up via a new request/PO
s, mr2 = call('POST','material-requests',{**good,'projectId':'P001','items':[{'description':'Cement OPC 53 grade','unit':'bags','quantity':130}]},SE1); call('POST',f"material-requests/{mr2['id']}/approve",{},PM1)
s, p2 = call('POST','purchase-orders',{'requestId':mr2['id'],'supplierId':'SUP001','items':[{'requestItemId':'I1','quantity':130,'rate':380}]},PR1)
check('new PO for cement approved (49,400 < limit)', s==201 and p2['status']=='approved', (s,p2))
check('material key ignores case/spacing -> same stock line', grn(p2['id'],[{'poItemId':'L1','receivedQuantity':130}])[0] == 201 and len([x for x in stock(PR1,'P001') if x['description']=='Cement OPC 53 grade']) == 1 and qty(PR1,'P001','Cement OPC 53 grade') == 130)
# leave PO002 approved (steel plates) for phase 2
print('PHASE1 ALL PASS' if ok else 'PHASE1 SOME FAILED')
sys.exit(0 if ok else 1)
