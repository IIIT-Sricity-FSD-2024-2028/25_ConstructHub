"""
Final acceptance test: the whole project lifecycle from the scope document's success scenario, through the API.
client requirement -> quotations -> contract -> project team -> milestones/tasks -> procurement & stock -> expenses ->
client billing & payments -> dashboards.   Fresh data/db first, then:  API=http://localhost:3000 python3 tests/api/step7-e2e-lifecycle.py
Follows the same story as the demo walkthrough in the main README.
"""
import json, os, sys, urllib.request, urllib.error, uuid, datetime
B = os.environ.get('API', 'http://localhost:3000')
TODAY = datetime.date.today(); iso = lambda d: d.isoformat(); FUT = lambda n: iso(TODAY + datetime.timedelta(days=n))
def call(method, path, body=None, token=None, headers=None):
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
    req = urllib.request.Request(B + '/' + path, method=method, data=data)
    if not (headers and 'Content-Type' in headers): req.add_header('Content-Type', 'application/json')
    for k, v in (headers or {}).items(): req.add_header(k, v)
    if token: req.add_header('Authorization', 'Bearer ' + token)
    try:
        r = urllib.request.urlopen(req); b = r.read(); return r.status, (json.loads(b) if b else None)
    except urllib.error.HTTPError as e:
        b = e.read()
        try: return e.code, json.loads(b)
        except Exception: return e.code, b
def multipart(name, filename, mime, content):
    boundary = uuid.uuid4().hex
    body = f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + f'\r\n--{boundary}--\r\n'.encode()
    return body, {'Content-Type': f'multipart/form-data; boundary={boundary}'}
ok = True; step = 0
def scene(title):
    global step; step += 1; print(f'\n{step:>2}. {title}')
def check(name, cond, extra=''):
    global ok
    print(('   ✓ ' if cond else '   ✗ FAIL ') + name + ('' if cond else ' -> ' + str(extra)[:300]))
    ok = ok and bool(cond)
def must(r, expect=(200, 201)):
    assert r[0] in expect, r
    return r[1]
def login(e, p='123456'): return must(call('POST', 'auth/login', {'email': e, 'password': p}))['accessToken']

SU = login('super@ch.com'); AD1 = login('admin@apex.com'); AD2 = login('admin@ltinfra.com'); PM = login('pm@apex.com'); PM2 = login('pm@ltinfra.com'); FM2 = login('finance@ltinfra.com')
FM = login('finance@apex.com'); SE = login('site@apex.com'); PR = login('proc@apex.com')

scene('Platform admin: plans and onboarding queue')
plans = must(call('GET', 'plans'))
check('three subscription plans, prices editable by the platform admin', len(plans['plans']) == 3)
check('platform dashboard loads', call('GET', 'dashboard', token=SU)[1]['companies']['approved'] == 2)

scene('Client signs up and publishes a requirement with drawings')
email = f'demo{uuid.uuid4().hex[:6]}@example.com'
must(call('POST', 'auth/register-client', {'name': 'Demo Client', 'email': email, 'password': 'Secret123', 'phone': '9876500111'}))
CL = login(email, 'Secret123')
req = must(call('POST', 'requirements', {'title': 'E2E 3BHK villa, Nashik', 'description': 'G+1 villa of 2,400 sq ft on an owned plot, drawings ready.', 'location': 'Nashik, Maharashtra', 'projectType': 'Residential', 'budgetMin': 5000000, 'budgetMax': 7000000, 'expectedDurationDays': 240, 'quotationDeadline': FUT(30)}, CL))
body, hdr = multipart('documents', 'plan.pdf', 'application/pdf', b'%PDF-1.4 drawings')
check('requirement published', req['status'] == 'open')
check('drawings uploaded (private)', len(must(call('POST', f"requirements/{req['id']}/documents", body, CL, headers=hdr))['documents']) == 1)

scene('Two verified companies quote; the client compares and awards')
def estimate(rid, admin, pm_tok, fm_tok, pm_id, fm_id, stages, advance=0, markup=0):
    """PM -> FM -> Admin estimate. stages = [(name, days, internal cost)]. Markup 0 keeps client price = internal cost."""
    q_ = must(call('POST', f'requirements/{rid}/assign-team', {'pmId': pm_id, 'fmId': fm_id}, admin))
    must(call('PATCH', f"quotations/{q_['id']}/pm-estimate", {'milestoneStages': [{'name': n, 'durationDays': d, 'materialScope': 'Scope of ' + n} for n, d, c in stages]}, pm_tok))
    must(call('PATCH', f"quotations/{q_['id']}/fm-estimate", {'stages': [{'internalCost': c} for n, d, c in stages], 'mobilizationAdvancePercent': advance}, fm_tok))
    return must(call('POST', f"quotations/{q_['id']}/release", {'markupPercent': markup, 'validUntil': FUT(60)}, admin))
check('the old standalone quotation endpoint is closed', call('POST', f"requirements/{req['id']}/quotations", {'items': [{'description': 'x', 'unit': 'ls', 'quantity': 1, 'rate': 1000}], 'durationDays': 10}, AD1)[0] == 400)
q_apex = estimate(req['id'], AD1, PM, FM, 'U002', 'U004', [('Foundation', 60, 2400000), ('Structure', 160, 3600000)])
q_lt = estimate(req['id'], AD2, PM2, FM2, 'U007', 'U009', [('Turnkey', 200, 6600000)])
cmp_ = must(call('GET', f"requirements/{req['id']}/quotations", token=CL))
check('client sees both quotations, cheapest first', [q['totalAmount'] for q in cmp_] == [6000000, 6600000])
check("competitors cannot see each other's quotation", call('GET', f"quotations/{q_lt['id']}", token=AD1)[0] == 404)
award = must(call('POST', f"quotations/{q_apex['id']}/accept", token=CL))
PID = award['projectId']; CID = award['contract']['id']
check('contract and project created automatically', award['contract']['value'] == 6000000 and call('GET', f'projects/{PID}', token=AD1)[1]['budget'] == 6000000)
check('the other quotation was rejected', must(call('GET', f"quotations/{q_lt['id']}", token=AD2))['status'] == 'rejected')

scene('Company assigns the project team')
must(call('PATCH', f'projects/{PID}', {'managerId': 'U002', 'financeManagerId': 'U004'}, AD1))
proj = must(call('GET', f'projects/{PID}', token=AD1))
check('project manager and finance manager assigned', proj['managerId'] == 'U002' and proj['financeManagerId'] == 'U004')

scene('Project manager plans milestones and tasks; engineer works')
seeded = {m['name']: m for m in must(call('GET', f'milestones?projectId={PID}', token=PM))}
ms1, ms2 = seeded['Foundation'], seeded['Structure']
check('award already seeded the two milestones with weights 40 / 60 from the quoted stages', ms1['weight'] == 40 and ms2['weight'] == 60)
task = lambda title, ms: {'title': title, 'projectId': PID, 'projectName': proj['name'], 'assignedTo': 'U003', 'priority': 'High', 'status': 'Pending', 'progress': 0, 'startDate': iso(TODAY), 'deadline': FUT(100), 'description': title, 'milestoneId': ms}
t1 = must(call('POST', 'tasks', task('Excavation and footings', ms1['id']), PM)); t2 = must(call('POST', 'tasks', task('RCC columns and slab', ms2['id']), PM))
must(call('PATCH', f"tasks/{t1['id']}", {'status': 'Completed', 'progress': 100}, SE)); must(call('PATCH', f"tasks/{t2['id']}", {'status': 'In Progress', 'progress': 50}, SE))
summary = must(call('GET', f'milestones/progress/{PID}', token=CL))
check('physical progress is weighted: 40% x 100 + 60% x 50 = 70%', summary['physicalProgress'] == 70, summary['physicalProgress'])
check('foundation is ready for review, nothing approved yet', summary['milestoneCompletion'] == 0 and [m for m in summary['milestones'] if m['name'] == 'Foundation'][0]['status'] == 'Ready for Review')
check('PM cannot approve a milestone without a linked site report', call('POST', f"milestones/{ms1['id']}/approve", token=PM)[0] == 400)
must(call('POST', 'reports', {'title': 'Foundation evidence', 'projectId': PID, 'submittedBy': 'U002', 'date': iso(TODAY), 'progress': 100, 'status': 'Completed', 'workDone': 'Foundation complete', 'priority': 'Low', 'materials': [], 'photos': 0, 'milestoneId': ms1['id'], 'weather': 'Cloudy', 'laborCount': 12}, PM))
must(call('POST', f"milestones/{ms1['id']}/approve", token=PM))
check('PM approves the foundation: 1 of 2 milestones, client notified', must(call('GET', f'milestones/progress/{PID}', token=CL))['milestoneCompletion'] == 50 and any(n['title'] == 'Milestone completed' for n in call('GET', 'notifications', token=CL)[1]))

scene('Materials: request -> approval -> purchase orders -> deliveries -> site stock')
mr = must(call('POST', 'material-requests', {'projectId': PID, 'items': [{'description': 'Cement OPC 53', 'unit': 'bags', 'quantity': 100}, {'description': 'TMT bars 16mm', 'unit': 'kg', 'quantity': 4000}], 'neededBy': FUT(10), 'priority': 'High'}, SE))
must(call('POST', f"material-requests/{mr['id']}/approve", {'note': 'As per BOQ'}, PM))
po_small = must(call('POST', 'purchase-orders', {'requestId': mr['id'], 'supplierId': 'SUP001', 'items': [{'requestItemId': 'I1', 'quantity': 100, 'rate': 400}]}, PR))
po_big = must(call('POST', 'purchase-orders', {'requestId': mr['id'], 'supplierId': 'SUP002', 'items': [{'requestItemId': 'I2', 'quantity': 4000, 'rate': 72}]}, PR))
check('small order auto-approved, large order needs the Finance Manager', po_small['status'] == 'approved' and po_big['status'] == 'pending_approval', (po_small['status'], po_big['status']))
check('nothing can be received before approval', call('POST', 'goods-receipts', {'poId': po_big['id'], 'items': [{'poItemId': 'L1', 'receivedQuantity': 1}]}, PR)[0] == 400)
must(call('POST', f"purchase-orders/{po_big['id']}/approve", {'note': 'Within budget'}, FM))
must(call('POST', 'goods-receipts', {'poId': po_small['id'], 'items': [{'poItemId': 'L1', 'receivedQuantity': 100}], 'deliveryNote': 'DC-1'}, PR))
must(call('POST', 'goods-receipts', {'poId': po_big['id'], 'items': [{'poItemId': 'L1', 'receivedQuantity': 1500}]}, PR))
check('over-delivery is refused', call('POST', 'goods-receipts', {'poId': po_big['id'], 'items': [{'poItemId': 'L1', 'receivedQuantity': 3000}]}, PR)[0] == 400)
stock = {s['description']: s for s in must(call('GET', f'stock?projectId={PID}', token=PR))}
check('site stock = deliveries (cement 100, TMT 1500 of 4000)', stock['Cement OPC 53']['quantity'] == 100 and stock['TMT bars 16mm']['quantity'] == 1500)
must(call('POST', 'stock/issues', {'items': [{'stockId': stock['Cement OPC 53']['id'], 'quantity': 40}], 'issuedTo': 'U003', 'taskId': t2['id']}, PR))
check('issuing material reduces stock (100 - 40 = 60)', {s['description']: s['quantity'] for s in must(call('GET', f'stock?projectId={PID}', token=SE))}['Cement OPC 53'] == 60)
check('big order partly received', must(call('GET', f"purchase-orders/{po_big['id']}", token=FM))['status'] == 'partially_received')

scene('Expenses: engineer -> project manager -> finance; only approved spend counts')
ex = must(call('POST', 'expenses', {'projectId': PID, 'category': 'Equipment', 'amount': 3200, 'date': iso(TODAY), 'description': 'Concrete mixer hire', 'milestoneId': ms1['id']}, SE))
b2, h2 = multipart('receipts', 'mixer.pdf', 'application/pdf', b'%PDF-1.4 receipt')
must(call('POST', f"expenses/{ex['id']}/receipts", b2, SE, headers=h2))
check('submitted expense is not spend yet', call('GET', f'projects/{PID}', token=FM)[1]['spent'] == 0)
must(call('POST', f"expenses/{ex['id']}/verify", {}, PM)); must(call('POST', f"expenses/{ex['id']}/approve", {}, FM))
check('approved expense becomes project spend (3,200)', call('GET', f'projects/{PID}', token=FM)[1]['spent'] == 3200)
must(call('POST', f"expenses/{ex['id']}/reimburse", {'reference': 'UPI-1'}, FM))

scene('Billing: finance bills the client, client accepts and pays (demo), finance records the rest')
check('FM cannot bill a milestone that is not approved yet', call('POST', 'bills', {'projectId': PID, 'milestoneId': ms2['id'], 'amount': 4200000}, FM)[0] == 400)
check('free-text bills are refused on a project with milestones', call('POST', 'bills', {'projectId': PID, 'amount': 1800000, 'milestone': 'Whatever I like'}, FM)[0] == 400)
bill = must(call('POST', 'bills', {'projectId': PID, 'milestoneId': ms1['id'], 'amount': 1800000, 'billNumber': 'FAKE-1', 'clientId': 'U999'}, FM))
check('bill is locked to the milestone; number and client come from the server', bill['milestoneId'] == ms1['id'] and bill['milestone'] == 'Foundation' and str(bill['billNumber']).startswith('INV-') and bill['billNumber'] != 'FAKE-1' and bill['clientId'] == proj['clientId'])
check('client cannot pay before accepting', call('POST', f"bills/{bill['id']}/payments", {'amount': 1000}, CL)[0] == 400)
must(call('PATCH', f"bills/{bill['id']}", {'status': 'Accepted'}, CL))
must(call('POST', f"bills/{bill['id']}/payments", {'amount': 800000}, CL))
r = must(call('POST', f"bills/{bill['id']}/payments", {'amount': 1600000, 'method': 'Bank transfer', 'reference': 'NEFT-E2E'}, FM))
check('bill fully paid by one demo payment and one recorded transfer', r['bill']['paymentStatus'] == 'Paid' and r['bill']['outstanding'] == 0)

scene('Dashboards agree with everything above')
cd = must(call('GET', 'dashboard', token=CL)); row = [p for p in cd['projects'] if p['id'] == PID][0]
check('client: progress 70%, 1 of 2 milestones approved, nothing outstanding', row['progress'] == 70 and row['milestoneCompletion'] == 50 and row['outstanding'] == 0 and row['paid'] == 2400000, row)
fd = must(call('GET', 'dashboard', token=FM)); frow = [p for p in fd['projects'] if p['id'] == PID][0]
check('finance: budget 60,00,000, spent 3,200, committed to POs 40,000 + 2,88,000', frow['budget'] == 6000000 and frow['spent'] == 3200 and frow['committed'] == 40000 + 288000, frow)
pd_ = must(call('GET', 'dashboard', token=PM)); check('project manager: tasks and milestones tracked', [p for p in pd_['projects'] if p['id'] == PID][0]['openTasks'] == 1)
sd = must(call('GET', 'dashboard', token=SU)); check('platform admin: marketplace contract recorded', sd['marketplace']['contracts'] >= 1 and sd['projects']['fromMarketplace'] >= 1)

scene('Traceability: every record points back to the contract')
check('contract -> project -> milestones -> tasks -> requests -> orders -> receipts -> stock -> expenses -> bills -> payments all share the project',
      proj['contractId'] == CID and all(x['projectId'] == PID for x in [ms1, t1, mr, po_small, ex, bill]) and len(must(call('GET', f"bills/{bill['id']}/payments", token=CL))) == 2)
# ════════════════════════════════════════════════════════════════════════════════════════════
# GATE 1 - Pre-award estimation: Admin -> PM stages -> FM costs -> Admin markup -> client award
# ════════════════════════════════════════════════════════════════════════════════════════════
scene('GATE 1: client with no award has no projects; Admin assigns PM + FM to a new requirement')
email2 = f'gate1{uuid.uuid4().hex[:6]}@example.com'
must(call('POST', 'auth/register-client', {'name': 'Gate One Client', 'email': email2, 'password': 'Secret123', 'phone': '9876500222'}))
CL2 = login(email2, 'Secret123')
check('client has no projects before awarding a quote', must(call('GET', 'projects', token=CL2)) == [])
req2 = must(call('POST', 'requirements', {'title': 'Gate1 bungalow, Pune', 'description': 'Two-storey bungalow, drawings ready, owned plot.', 'location': 'Pune, Maharashtra', 'projectType': 'Residential', 'budgetMin': 5000000, 'budgetMax': 8000000, 'expectedDurationDays': 200, 'quotationDeadline': FUT(30)}, CL2))
PM_ID, FM_ID = 'U002', 'U004'
LT_PM = login('pm@ltinfra.com')
check('assign-team: only a company admin may do it', call('POST', f"requirements/{req2['id']}/assign-team", {'pmId': PM_ID, 'fmId': FM_ID}, PM)[0] == 403)
check('assign-team rejects a PM from another company', call('POST', f"requirements/{req2['id']}/assign-team", {'pmId': 'U007', 'fmId': FM_ID}, AD1)[0] == 400)
check('assign-team rejects a user with the wrong role (FM given as PM)', call('POST', f"requirements/{req2['id']}/assign-team", {'pmId': FM_ID, 'fmId': FM_ID}, AD1)[0] == 400)
est = must(call('POST', f"requirements/{req2['id']}/assign-team", {'pmId': PM_ID, 'fmId': FM_ID}, AD1))
check('estimate opened as "estimating / assigned"', est['status'] == 'estimating' and est['estimationStatus'] == 'assigned' and est['assignedPmId'] == PM_ID)
check('client cannot see the estimate being prepared', must(call('GET', f"requirements/{req2['id']}/quotations", token=CL2)) == [] and call('GET', f"quotations/{est['id']}", token=CL2)[0] == 404)
check('company admin cannot bypass the estimate with a standalone quote while estimating', call('POST', f"requirements/{req2['id']}/quotations", {'items': [{'description': 'x', 'unit': 'ls', 'quantity': 1, 'rate': 1000}], 'durationDays': 10}, AD1)[0] == 400)

scene('GATE 1: PM defines stages but can never price them')
check('FM has nothing in the queue before the PM submits', must(call('GET', 'quotations/estimates', token=FM)) == [])
check('FM cannot price before the PM submitted the stages', call('PATCH', f"quotations/{est['id']}/fm-estimate", {'stages': [{'internalCost': 1000}], 'mobilizationAdvancePercent': 10}, FM)[0] == 409)
check('a PM who is not assigned cannot edit the estimate', call('PATCH', f"quotations/{est['id']}/pm-estimate", {'milestoneStages': [{'name': 'Foundation', 'durationDays': 10, 'materialScope': 'cement'}]}, LT_PM)[0] == 403)
check('PM cannot call the FM pricing step', call('PATCH', f"quotations/{est['id']}/fm-estimate", {'stages': [{'internalCost': 1000}], 'mobilizationAdvancePercent': 10}, PM)[0] == 403)
check('PM cannot release a quotation', call('POST', f"quotations/{est['id']}/release", {'markupPercent': 10}, PM)[0] == 403)
check('PM stage list needs at least one stage', call('PATCH', f"quotations/{est['id']}/pm-estimate", {'milestoneStages': []}, PM)[0] == 400)
check('duplicate stage names are rejected', call('PATCH', f"quotations/{est['id']}/pm-estimate", {'milestoneStages': [{'name': 'Foundation', 'durationDays': 10, 'materialScope': 'a'}, {'name': 'foundation', 'durationDays': 10, 'materialScope': 'b'}]}, PM)[0] == 400)
sneaky = must(call('PATCH', f"quotations/{est['id']}/pm-estimate", {'milestoneStages': [
    {'name': 'Foundation and plinth', 'durationDays': 60, 'materialScope': 'Cement 400 bags, steel 6 t', 'internalCost': 1, 'clientAmount': 1},
    {'name': 'Superstructure', 'durationDays': 90, 'materialScope': 'RCC frame, brickwork', 'internalCost': 1},
    {'name': 'Finishing', 'durationDays': 50, 'materialScope': 'Plaster, paint, flooring'}]}, PM))
check('PM submit moves the estimate to pm_submitted and totals the days', sneaky['estimationStatus'] == 'pm_submitted' and sneaky['durationDays'] == 200)
check('a price typed in by the PM is ignored (no internal cost or client amount stored)', all('internalCost' not in st and 'clientAmount' not in st for st in sneaky['milestoneStages']) and not sneaky.get('internalBaseCost'))
pm_q = must(call('GET', 'quotations/estimates', token=PM))
check('PM queue shows the estimate and none of its costs', len(pm_q) == 1 and all('internalCost' not in st for st in pm_q[0]['milestoneStages']) and 'internalBaseCost' not in pm_q[0])

scene('GATE 1: FM prices the stages and the advance %, but cannot set markup or release')
fm_q = must(call('GET', 'quotations/estimates', token=FM))
check('FM queue now shows the estimate', len(fm_q) == 1 and fm_q[0]['id'] == est['id'])
check('FM must price every stage (count mismatch is rejected)', call('PATCH', f"quotations/{est['id']}/fm-estimate", {'stages': [{'internalCost': 1000}], 'mobilizationAdvancePercent': 10}, FM)[0] == 400)
check('advance above 50% is rejected', call('PATCH', f"quotations/{est['id']}/fm-estimate", {'stages': [{'internalCost': 1000}, {'internalCost': 1000}, {'internalCost': 1000}], 'mobilizationAdvancePercent': 60}, FM)[0] == 400)
priced = must(call('PATCH', f"quotations/{est['id']}/fm-estimate", {'stages': [{'internalCost': 1500000}, {'internalCost': 2500000}, {'internalCost': 1000000}], 'mobilizationAdvancePercent': 15, 'markupPercent': 99}, FM))
check('FM total = internal base cost 50,00,000 and advance 15%', priced['estimationStatus'] == 'fm_submitted' and priced['internalBaseCost'] == 5000000 and priced['mobilizationAdvancePercent'] == 15)
check('FM cannot edit markup (a markupPercent in the FM payload is ignored)', priced.get('markupPercent') is None)
check('FM cannot release the quotation', call('POST', f"quotations/{est['id']}/release", {'markupPercent': 20}, FM)[0] == 403)
check('PM can no longer change stages once the FM priced them', call('PATCH', f"quotations/{est['id']}/pm-estimate", {'milestoneStages': [{'name': 'Only stage', 'durationDays': 10, 'materialScope': 'x'}]}, PM)[0] == 409)

scene('GATE 1: Admin adds profit markup and releases; client sees stages, never internal cost')
check('release by a different company admin is refused', call('POST', f"quotations/{est['id']}/release", {'markupPercent': 20}, AD2)[0] == 403)
check('markup above 200% is rejected', call('POST', f"quotations/{est['id']}/release", {'markupPercent': 250}, AD1)[0] == 400)
rel = must(call('POST', f"quotations/{est['id']}/release", {'markupPercent': 20, 'validUntil': FUT(60)}, AD1))
check('20% markup on 50,00,000 = client quote 60,00,000', rel['status'] == 'submitted' and rel['estimationStatus'] == 'submitted' and rel['totalAmount'] == 6000000 and rel['markupPercent'] == 20)
check('stage client amounts add up to the total', sum(st['clientAmount'] for st in rel['milestoneStages']) == 6000000 and [st['clientAmount'] for st in rel['milestoneStages']] == [1800000, 3000000, 1200000])
cq = must(call('GET', f"requirements/{req2['id']}/quotations", token=CL2))
check('client now sees exactly one quotation with the stage schedule and advance %', len(cq) == 1 and len(cq[0]['milestoneStages']) == 3 and cq[0]['mobilizationAdvancePercent'] == 15 and cq[0]['durationDays'] == 200)
leak = json.dumps(cq)
check('client payload contains no internal cost, markup or staff ids', not any(k in leak for k in ['internalBaseCost', 'markupPercent', 'internalCost', 'assignedPmId', 'assignedFmId']), leak[:200])
check('a released quote can no longer be released again', call('POST', f"quotations/{est['id']}/release", {'markupPercent': 30}, AD1)[0] == 400)

scene('GATE 1: award provisions the project (Awaiting Advance), locked milestones and Bill #1')
acc = must(call('POST', f"quotations/{est['id']}/accept", token=CL2))
GP = acc['projectId']
gproj = must(call('GET', f"projects/{GP}", token=AD1))
check('project starts "Awaiting Advance" with the quote PM and FM', gproj['status'] == 'Awaiting Advance' and gproj['managerId'] == PM_ID and gproj['financeManagerId'] == FM_ID, gproj)
check('internal site budget (50,00,000) is kept apart from contract value (60,00,000)', gproj['budget'] == 5000000 and gproj['contractValue'] == 6000000)
gms = must(call('GET', f"milestones?projectId={GP}", token=PM))
check('three milestones seeded from the stages, weights add up to 100', len(gms) == 3 and sum(m['weight'] for m in gms) == 100, [m['weight'] for m in gms])
check('milestones carry internal budget and the quoted client stage amount', [m['internalBudget'] for m in gms] == [1500000, 2500000, 1000000] and [m['clientStageAmount'] for m in gms] == [1800000, 3000000, 1200000])
check('milestone deadlines run back to back (60, 150, 200 days)', gms[-1]['deadline'] > gms[0]['deadline'] and len({m['deadline'] for m in gms}) == 3)
gbills = [b for b in must(call('GET', 'bills', token=AD1)) if b['projectId'] == GP]
check('Bill #1 "Mobilization Advance" = 15% = 9,00,000, accepted and unpaid', len(gbills) == 1 and gbills[0]['amount'] == 900000 and gbills[0]['milestone'] == 'Mobilization Advance' and gbills[0]['paymentStatus'] == 'Unpaid', gbills)
check('Bill #1 has a server-generated INV- number', str(gbills[0]['billNumber']).startswith('INV-'))
cproj = must(call('GET', f"projects/{GP}", token=CL2))
check('client sees the contract value as budget and no internal spend or cost split', cproj['budget'] == 6000000 and 'allocations' not in cproj and 'spent' not in cproj and 'internalBaseCost' not in cproj)
cms = must(call('GET', f"milestones?projectId={GP}", token=CL2))
check('client milestones show the stage amount but not the internal budget', len(cms) == 3 and all('internalBudget' not in m for m in cms) and cms[0]['clientStageAmount'] == 1800000)
check('client now has one project', len(must(call('GET', 'projects', token=CL2))) == 1)

# ════════════════════════════════════════════════════════════════════════════════════════════
# GATE 2 - Mobilization Advance: no field execution or POs until Bill #1 is paid
# ════════════════════════════════════════════════════════════════════════════════════════════
scene('GATE 2: while "Awaiting Advance", tasks and purchase orders are blocked')
SE_ID = 'U003'
must(call('PATCH', f'projects/{GP}', {'siteEngineerId': SE_ID}, AD1))
gtask = {'title': 'Gate2 excavation', 'projectId': GP, 'projectName': gproj['name'], 'assignedTo': SE_ID, 'priority': 'High', 'status': 'Pending', 'progress': 0, 'startDate': iso(TODAY), 'deadline': FUT(100), 'description': 'Gate2 excavation', 'milestoneId': gms[0]['id']}
check('PM cannot create a task before the advance is paid (400)', call('POST', 'tasks', gtask, PM)[0] == 400)
check('manual status change away from Awaiting Advance is refused', call('PATCH', f'projects/{GP}', {'status': 'On Track'}, AD1)[0] == 400)
gmr_body = {'projectId': GP, 'items': [{'description': 'Cement OPC 53', 'unit': 'bags', 'quantity': 100}], 'neededBy': FUT(10), 'priority': 'High'}
check('engineer has no task, so cannot raise a material request before the advance is paid', call('POST', 'material-requests', gmr_body, SE)[0] in (400, 403, 404))
check('project is still Awaiting Advance', must(call('GET', f'projects/{GP}', token=AD1))['status'] == 'Awaiting Advance')

scene('GATE 2: paying Bill #1 unlocks the project immediately')
adv = gbills[0]
check('client cannot pay more than the advance outstanding', call('POST', f"bills/{adv['id']}/payments", {'amount': 900001}, CL2)[0] == 400)
part = must(call('POST', f"bills/{adv['id']}/payments", {'amount': 400000}, CL2))
check('a partial advance payment does not unlock the project', part['bill']['paymentStatus'] == 'Partially Paid' and must(call('GET', f'projects/{GP}', token=AD1))['status'] == 'Awaiting Advance' and call('POST', 'tasks', gtask, PM)[0] == 400)
full = must(call('POST', f"bills/{adv['id']}/payments", {'amount': 500000}, CL2))
check('paying the rest marks Bill #1 Paid and starts the project', full['bill']['paymentStatus'] == 'Paid' and full.get('projectStarted') is True)
check('project flipped to On Track', must(call('GET', f'projects/{GP}', token=AD1))['status'] == 'On Track')
check('task creation now works', call('POST', 'tasks', gtask, PM)[0] in (200, 201))
gmr = must(call('POST', 'material-requests', gmr_body, SE)); must(call('POST', f"material-requests/{gmr['id']}/approve", {'note': 'ok'}, PM))
check('engineer request, PM approval and storekeeper PO all work after unlock', call('POST', 'purchase-orders', {'requestId': gmr['id'], 'supplierId': 'SUP001', 'items': [{'requestItemId': 'I1', 'quantity': 100, 'rate': 400}]}, PR)[0] in (200, 201))

# ════════════════════════════════════════════════════════════════════════════════════════════
# GATE 3 - Field & budget controls: petty cap, milestone-linked reports + stock, GRN invoice, top-ups
# ════════════════════════════════════════════════════════════════════════════════════════════
def raw(method, path, token):
    rq = urllib.request.Request(B + '/' + path, method=method); rq.add_header('Authorization', 'Bearer ' + token)
    try:
        r = urllib.request.urlopen(rq); return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
G_MS = gms[0]['id']
g_task = [t for t in must(call('GET', 'tasks', token=PM)) if t['projectId'] == GP and t['title'] == 'Gate2 excavation'][0]

scene('GATE 3: site engineer petty expenses are capped and tied to a milestone')
gex = {'projectId': GP, 'milestoneId': G_MS, 'category': 'Equipment', 'amount': 3000, 'date': iso(TODAY), 'description': 'Gate3 mixer hire'}
check('expense above INR 10,000 is refused and points to Procurement POs', (lambda r: r[0] == 400 and 'purchase order' in json.dumps(r[1]))(call('POST', 'expenses', {**gex, 'amount': 10001}, SE)))
check('expense exactly at the cap is accepted', call('POST', 'expenses', {**gex, 'amount': 10000, 'description': 'Gate3 at the cap'}, SE)[0] == 201)
check('expense without a milestone is refused on a milestone project', call('POST', 'expenses', {k: v for k, v in gex.items() if k != 'milestoneId'}, SE)[0] == 400)
check('expense for a milestone of another project is refused', call('POST', 'expenses', {**gex, 'milestoneId': 'MS001'}, SE)[0] == 400)
gx = must(call('POST', 'expenses', gex, SE))
check('expense stores its milestone', gx['milestoneId'] == G_MS and gx['milestoneName'] == gms[0]['name'])

scene('GATE 3: PO above the approval limit locks until the FM approves; GRN carries milestone + vendor invoice')
gmr_body['items'] = [{'description': 'Cement OPC 53', 'unit': 'bags', 'quantity': 100}, {'description': 'TMT bars 16mm', 'unit': 'kg', 'quantity': 2000}]
gmr3 = must(call('POST', 'material-requests', gmr_body, SE)); must(call('POST', f"material-requests/{gmr3['id']}/approve", {'note': 'ok'}, PM))
gpo_small = must(call('POST', 'purchase-orders', {'requestId': gmr3['id'], 'supplierId': 'SUP001', 'items': [{'requestItemId': 'I1', 'quantity': 100, 'rate': 400}]}, PR))
gpo_big = must(call('POST', 'purchase-orders', {'requestId': gmr3['id'], 'supplierId': 'SUP002', 'items': [{'requestItemId': 'I2', 'quantity': 2000, 'rate': 72}]}, PR))
check('small PO auto-approved, large PO (1,44,000) waits for the FM', gpo_small['status'] == 'approved' and gpo_big['status'] == 'pending_approval')
check('storekeeper cannot receive goods against the locked PO', call('POST', 'goods-receipts', {'poId': gpo_big['id'], 'items': [{'poItemId': 'L1', 'receivedQuantity': 10}]}, PR)[0] == 400)
check('a milestone of another project is refused on the GRN', call('POST', 'goods-receipts', {'poId': gpo_small['id'], 'milestoneId': 'MS001', 'items': [{'poItemId': 'L1', 'receivedQuantity': 100}]}, PR)[0] == 400)
grn = must(call('POST', 'goods-receipts', {'poId': gpo_small['id'], 'milestoneId': G_MS, 'deliveryNote': 'DC-9', 'items': [{'poItemId': 'L1', 'receivedQuantity': 100}]}, PR))['receipt']
check('GRN is tagged with the milestone', grn['milestoneId'] == G_MS)
body, hdr = multipart('invoice', 'invoice-9.pdf', 'application/pdf', b'%PDF-1.4 vendor invoice')
up = must(call('POST', f"goods-receipts/{grn['id']}/invoice", body, PR, headers=hdr))
check('vendor invoice attached; stored file name is not exposed', up['vendorInvoice']['originalName'] == 'invoice-9.pdf' and 'storedName' not in up['vendorInvoice'])
bad_body, bad_hdr = multipart('invoice', 'malware.exe', 'application/x-msdownload', b'MZ')
check('invoice upload rejects a disallowed file type', call('POST', f"goods-receipts/{grn['id']}/invoice", bad_body, PR, headers=bad_hdr)[0] == 400)
check('finance manager can download the invoice', raw('GET', f"goods-receipts/{grn['id']}/invoice", FM) == (200, b'%PDF-1.4 vendor invoice'))
check('client cannot download the vendor invoice', raw('GET', f"goods-receipts/{grn['id']}/invoice", CL2)[0] == 403)
check('site engineer cannot attach invoices', call('POST', f"goods-receipts/{grn['id']}/invoice", body, SE, headers=hdr)[0] == 403)
gstock = {x['description']: x for x in must(call('GET', f'stock?projectId={GP}', token=PR))}
must(call('POST', 'stock/issues', {'items': [{'stockId': gstock['Cement OPC 53']['id'], 'quantity': 60}], 'issuedTo': 'U003', 'taskId': g_task['id']}, PR))

scene('GATE 3: site report is linked to a milestone, weather, labor and issued stock; progress cannot be typed in')
rep = {'title': 'Gate3 daily report', 'projectId': GP, 'projectName': gproj['name'], 'submittedBy': 'U003', 'date': iso(TODAY), 'progress': 99, 'status': 'Submitted',
       'workDone': 'Excavation done', 'priority': 'Medium', 'photos': 0, 'materials': [{'name': 'Cement OPC 53', 'qty': 40, 'unit': 'bags'}],
       'milestoneId': G_MS, 'taskId': g_task['id'], 'weather': 'Sunny', 'laborCount': 14}
check('report without a milestone is refused', call('POST', 'reports', {k: v for k, v in rep.items() if k != 'milestoneId'}, SE)[0] == 400)
check('report without weather is refused', call('POST', 'reports', {k: v for k, v in rep.items() if k != 'weather'}, SE)[0] == 400)
check('report without labor count is refused', call('POST', 'reports', {k: v for k, v in rep.items() if k != 'laborCount'}, SE)[0] == 400)
check('report with a task of another milestone is refused', call('POST', 'reports', {**rep, 'milestoneId': gms[1]['id']}, SE)[0] == 400)
check('material never issued to the engineer cannot be reported', call('POST', 'reports', {**rep, 'materials': [{'name': 'TMT bars 16mm', 'qty': 5, 'unit': 'kg'}]}, SE)[0] == 400)
check('reporting more than the issued stock is refused (only 60 bags issued)', call('POST', 'reports', {**rep, 'materials': [{'name': 'Cement OPC 53', 'qty': 61, 'unit': 'bags'}]}, SE)[0] == 400)
avail = {a['description']: a for a in must(call('GET', f'reports/stock-available?projectId={GP}', token=SE))}
check('stock-available shows 60 bags issued, 60 available', avail['Cement OPC 53']['issued'] == 60 and avail['Cement OPC 53']['available'] == 60)
r1 = must(call('POST', 'reports', rep, SE))
check('valid report saved with milestone, task, weather and labor', r1['milestoneId'] == G_MS and r1['taskId'] == g_task['id'] and r1['weather'] == 'Sunny' and r1['laborCount'] == 14)
check('typed-in progress (99) is replaced by the task progress', r1['progress'] == g_task['progress'] and r1['progress'] != 99)
check('project progress was not overwritten by the report', must(call('GET', f'projects/{GP}', token=AD1))['progress'] == 0)
check('stock left to report drops to 20', {a['description']: a for a in must(call('GET', f'reports/stock-available?projectId={GP}', token=SE))}['Cement OPC 53']['available'] == 20)
check('a second report cannot re-use the same 40 bags plus more than 20', call('POST', 'reports', {**rep, 'materials': [{'name': 'Cement OPC 53', 'qty': 21, 'unit': 'bags'}]}, SE)[0] == 400)
check('milestone link cannot be rewritten afterwards', must(call('PATCH', f"reports/{r1['id']}", {'milestoneId': gms[1]['id'], 'progress': 80, 'workDone': 'Excavation and footings done'}, SE))['milestoneId'] == G_MS)
check('client sees the report of their project', any(x['id'] == r1['id'] for x in must(call('GET', 'reports', token=CL2))))

scene('GATE 3: FM requests a contingency top-up; Admin approval moves money from profit to the site budget')
check('FM cannot ask for more than the company can release', call('POST', 'budget-topups', {'projectId': GP, 'amount': 2000000, 'reason': 'Steel price rise on all stages'}, FM)[0] == 400)
check('reason must be meaningful', call('POST', 'budget-topups', {'projectId': GP, 'amount': 100000, 'reason': 'more'}, FM)[0] == 400)
check('only the project FM may request', call('POST', 'budget-topups', {'projectId': GP, 'amount': 100000, 'reason': 'Steel price rose after PO approval'}, PM)[0] == 403)
tu = must(call('POST', 'budget-topups', {'projectId': GP, 'amount': 300000, 'reason': 'Steel price rose after PO approval'}, FM))
check('request is pending', tu['status'] == 'pending' and tu['amount'] == 300000)
check('a second pending request is refused', call('POST', 'budget-topups', {'projectId': GP, 'amount': 100000, 'reason': 'Another overrun on stage two'}, FM)[0] == 409)
check('FM cannot approve their own request', call('POST', f"budget-topups/{tu['id']}/approve", {}, FM)[0] == 403)
check('FM does not see the profit margin, Admin does', 'profitMargin' not in must(call('GET', 'budget-topups', token=FM))[0] and must(call('GET', 'budget-topups', token=AD1))[0]['profitMargin'] == 1000000)
before_b = must(call('GET', f'projects/{GP}', token=AD1))['budget']
ap = must(call('POST', f"budget-topups/{tu['id']}/approve", {'note': 'Release from contingency'}, AD1))
after = must(call('GET', f'projects/{GP}', token=AD1))
check('approval raises the site budget by 3,00,000 (50,00,000 to 53,00,000)', before_b == 5000000 and after['budget'] == 5300000 and ap['budgetAfter'] == 5300000)
check('contract value unchanged, so profit margin falls from 10,00,000 to 7,00,000', after['contractValue'] == 6000000 and after['contractValue'] - after['budget'] == 700000)
check('client still sees the contract value, not the raised budget', must(call('GET', f'projects/{GP}', token=CL2))['budget'] == 6000000)
check('an approved request cannot be decided again', call('POST', f"budget-topups/{tu['id']}/reject", {'note': 'too late'}, AD1)[0] == 409)
check('request above the remaining margin (7,00,000) is refused', call('POST', 'budget-topups', {'projectId': GP, 'amount': 800000, 'reason': 'Large overrun on the finishing stage'}, FM)[0] == 400)
tu2 = must(call('POST', 'budget-topups', {'projectId': GP, 'amount': 200000, 'reason': 'Labor rates went up in monsoon'}, FM))
check('rejection needs a reason', call('POST', f"budget-topups/{tu2['id']}/reject", {}, AD1)[0] == 400)
check('rejected request leaves the budget unchanged', must(call('POST', f"budget-topups/{tu2['id']}/reject", {'note': 'Absorb within base budget'}, AD1))['status'] == 'rejected' and must(call('GET', f'projects/{GP}', token=AD1))['budget'] == 5300000)

scene('GATE 3: site budget of an awarded project cannot be changed by hand; internal stage budgets stay with the money roles')
check('FM cannot raise the site budget directly (must use a top-up request)', call('PATCH', f'projects/{GP}', {'budget': 9999999}, FM)[0] == 403)
check('PM cannot change the site budget either', call('PATCH', f'projects/{GP}', {'budget': 1}, PM)[0] == 403)
check('FM can still re-split the budget between categories', call('PATCH', f'projects/{GP}', {'allocations': {'Materials': 2000000, 'Labor': 1500000, 'Equipment': 800000, 'Other': 1000000}}, FM)[0] == 200)
check('site budget is unchanged after those attempts', must(call('GET', f'projects/{GP}', token=AD1))['budget'] == 5300000)
for who, tok in (('storekeeper', PR), ('site engineer', SE)):
    ml = call('GET', f'milestones?projectId={GP}', token=tok)
    check(f'{who} can read milestones but not their internal budget', ml[0] == 200 and len(ml[1]) == 3 and all('internalBudget' not in m for m in ml[1]), ml)
check('PM sees the internal budget of each stage', all('internalBudget' in m for m in must(call('GET', f'milestones?projectId={GP}', token=PM))))

# ════════════════════════════════════════════════════════════════════════════════════════════
# GATE 4 - Milestone-locked RA billing, evidence-backed approval, persistent client feedback
# ════════════════════════════════════════════════════════════════════════════════════════════
scene('GATE 4: a milestone needs finished tasks AND a linked site report before the PM can approve it')
G_MS2 = gms[1]['id']
t_g4 = must(call('POST', 'tasks', {**gtask, 'title': 'Gate4 superstructure', 'description': 'Gate4 superstructure', 'milestoneId': G_MS2}, PM))
must(call('PATCH', f"tasks/{t_g4['id']}", {'status': 'Completed', 'progress': 100}, SE))
check('tasks done but no site report on the milestone: approval refused', (lambda r: r[0] == 400 and 'site report' in json.dumps(r[1]))(call('POST', f'milestones/{G_MS2}/approve', token=PM)))
check('milestone with unfinished tasks cannot be approved even with a report', call('POST', f'milestones/{G_MS}/approve', token=PM)[0] == 400)
must(call('PATCH', f"tasks/{g_task['id']}", {'status': 'Completed', 'progress': 100}, SE))
appr = must(call('POST', f'milestones/{G_MS}/approve', token=PM))
check('with all tasks at 100% and a linked report the PM can approve', appr['status'] == 'Completed')

scene('GATE 4: bills only for approved milestones, amount fixed by the quote, proof bundled, number from the server')
check('FM cannot bill a milestone that is not approved (Structure)', (lambda r: r[0] == 400 and 'not approved' in json.dumps(r[1]))(call('POST', 'bills', {'projectId': GP, 'milestoneId': G_MS2}, FM)))
check('free-text bills are refused on a milestone project', call('POST', 'bills', {'projectId': GP, 'milestone': 'My own stage', 'amount': 500000}, FM)[0] == 400)
check('PM cannot generate bills', call('POST', 'bills', {'projectId': GP, 'milestoneId': G_MS}, PM)[0] == 403)
check('client cannot generate bills', call('POST', 'bills', {'projectId': GP, 'milestoneId': G_MS}, CL2)[0] == 403)
sheet = must(call('GET', f'bills/billable/{GP}', token=FM))
row0 = [m for m in sheet['milestones'] if m['id'] == G_MS][0]
check('billing sheet: foundation is billable, quoted 18,00,000, net 15,30,000 after advance recovery, 1 site report as proof', row0['billable'] is True and row0['clientStageAmount'] == 1800000 and row0['netBillAmount'] == 1530000 and row0['siteReportCount'] >= 1, row0)
check('billing sheet shows internal spend: PO deliveries 40,000 and internal budget 15,00,000', row0['poSpend'] == 40000 and row0['internalBudget'] == 1500000, row0)
check('Structure is not billable yet', [m for m in sheet['milestones'] if m['id'] == G_MS2][0]['billable'] is False)
check('billing sheet is hidden from PM and client', call('GET', f'bills/billable/{GP}', token=PM)[0] == 403 and call('GET', f'bills/billable/{GP}', token=CL2)[0] == 403)
sb = must(call('POST', 'bills', {'projectId': GP, 'milestoneId': G_MS, 'amount': 1, 'billNumber': 'FAKE', 'clientId': 'U999', 'description': 'Foundation stage'}, FM))
check('typed-in amount ignored: bill = quoted stage 18,00,000 less 15% advance recovery 2,70,000 = 15,30,000', sb['amount'] == 1530000 and sb['stageAmount'] == 1800000 and sb['advanceRecovery'] == 270000 and sb['milestone'] == gms[0]['name'] and sb['milestoneId'] == G_MS, sb)
check('server generated the INV- number and took the client from the project', str(sb['billNumber']).startswith('INV-') and sb['billNumber'] != 'FAKE' and sb['clientId'] == gproj['clientId'])
check('bill bundles the linked site report ids', r1['id'] in sb['siteReportIds'], sb.get('siteReportIds'))
check('a milestone cannot be billed twice', call('POST', 'bills', {'projectId': GP, 'milestoneId': G_MS}, FM)[0] == 409)
cb = [b for b in must(call('GET', 'bills', token=CL2)) if b['id'] == sb['id']][0]
leak4 = json.dumps(cb)
check('client sees the bill with proof but no internal spend', r1['id'] in cb['siteReportIds'] and 'poSpend' not in leak4 and 'expenseSpend' not in leak4 and 'internalBudget' not in leak4)
check('client can open the bundled site report', call('GET', f"reports/{r1['id']}", token=CL2)[0] == 200)
must(call('PATCH', f"bills/{sb['id']}", {'status': 'Declined', 'rejectionReason': 'Quantities do not match the report'}, CL2))
sb2 = call('POST', 'bills', {'projectId': GP, 'milestoneId': G_MS}, FM)
check('after the client declines, the milestone can be billed again', sb2[0] in (200, 201) and sb2[1]['billNumber'] != sb['billNumber'], sb2)

scene('GATE 4: advance is recovered from the stage bills, so every stage can be billed and the total equals the contract')
def finish_and_bill(ms_id, title):
    tk = must(call('POST', 'tasks', {**gtask, 'title': title, 'description': title, 'milestoneId': ms_id}, PM)) if ms_id != G_MS2 else t_g4
    must(call('PATCH', f"tasks/{tk['id']}", {'status': 'Completed', 'progress': 100}, SE))
    must(call('POST', 'reports', {'title': title + ' evidence', 'projectId': GP, 'submittedBy': 'U002', 'date': iso(TODAY), 'progress': 100, 'status': 'Completed', 'workDone': title, 'priority': 'Low', 'materials': [], 'photos': 0, 'milestoneId': ms_id, 'weather': 'Cloudy', 'laborCount': 9}, PM))
    must(call('POST', f'milestones/{ms_id}/approve', token=PM))
    return must(call('POST', 'bills', {'projectId': GP, 'milestoneId': ms_id}, FM))
b2 = finish_and_bill(G_MS2, 'Gate4 superstructure'); b3 = finish_and_bill(gms[2]['id'], 'Gate4 finishing')
check('Structure net 30,00,000 x 85% = 25,50,000 and Finishing net 12,00,000 x 85% = 10,20,000', b2['amount'] == 2550000 and b3['amount'] == 1020000, (b2['amount'], b3['amount']))
live = [b for b in must(call('GET', 'bills', token=FM)) if b['projectId'] == GP and b['status'] != 'Declined']
check('advance + all three stage bills = contract value 60,00,000 exactly', sum(b['amount'] for b in live) == 6000000, [(b['billNumber'], b['amount']) for b in live])
sheet2 = must(call('GET', f'bills/billable/{GP}', token=FM))
check('billing sheet shows nothing left to bill and no remaining contract value', sheet2['project']['remaining'] == 0 and all(m['billed'] for m in sheet2['milestones']), sheet2['project'])

scene('GATE 4: client feedback is kept; Clear All does not remove it')
fb = must(call('POST', 'feedback', {'projectId': GP, 'category': 'Communication', 'subject': 'Weekly updates', 'message': 'Please share a weekly summary of site progress.', 'priority': 'Medium'}, CL2))
check('feedback saved with subject, category and project', fb['subject'] == 'Weekly updates' and fb['projectId'] == GP and fb['clientId'] == gproj['clientId'])
check('client cannot send feedback about someone else\'s project', call('POST', 'feedback', {'projectId': PID, 'category': 'General', 'subject': 'Not mine', 'message': 'Should be refused', 'priority': 'Low'}, CL2)[0] == 404)
check('project manager is notified', any(n.get('type') == 'feedback' for n in must(call('GET', 'notifications', token=PM))))
call('DELETE', 'notifications/clear/all', None, PM); call('DELETE', 'notifications', None, CL2)
check('Clear All removed the PM notifications except feedback', [n.get('type') for n in must(call('GET', 'notifications', token=PM))] == ['feedback'])
check('client still has the submitted feedback in their history', [f['id'] for f in must(call('GET', 'feedback', token=CL2))] == [fb['id']])
check('project manager can read the feedback; other clients cannot', any(f['id'] == fb['id'] for f in must(call('GET', 'feedback', token=PM))) and must(call('GET', 'feedback', token=CL)) == [])

# ════════════════════════════════════════════════════════════════════════════════════════════
# SEEDED DEMO PROJECT P001 - already a marketplace-awarded project on the unified flow
# ════════════════════════════════════════════════════════════════════════════════════════════
scene('SEEDED P001: awarded through REQ003 / QUO005 / CON001, active, advance paid, Foundation approved and billed')
p1 = must(call('GET', 'projects/P001', token=AD1))
check('P001 is a marketplace project: internal budget 2,50,00,000 vs contract value 3,12,50,000', p1['source'] == 'marketplace' and p1['status'] == 'On Track' and p1['budget'] == 25000000 and p1['contractValue'] == 31250000 and p1['quotationId'] == 'QUO005' and p1['contractId'] == 'CON001', p1)
check('its requirement is awarded and its contract is active', must(call('GET', 'requirements/REQ003', token=must(call('POST', 'auth/login', {'email': 'client1@gmail.com', 'password': '123456'}))['accessToken']))['status'] == 'awarded' and [c['status'] for c in must(call('GET', 'contracts', token=AD1)) if c['id'] == 'CON001'] == ['active'])
check('the winning quotation carries stages with internal cost and client amount; the client copy hides the internal side', (lambda q: q['internalBaseCost'] == 25000000 and q['milestoneStages'][0]['clientAmount'] == 5000000)(must(call('GET', 'quotations/QUO005', token=AD1))))
adv = [b for b in must(call('GET', 'bills', token=FM)) if b['projectId'] == 'P001' and b.get('billType') == 'advance']
check('Bill #1 (mobilization advance, 10% = 31,25,000) is fully paid', len(adv) == 1 and adv[0]['amount'] == 3125000 and adv[0]['paymentStatus'] == 'Paid' and adv[0]['outstanding'] == 0, adv)
sh = must(call('GET', 'bills/billable/P001', token=FM)); byname = {m['name']: m for m in sh['milestones']}
check('Foundation: approved with site report R001 and already billed as INV-APEX-001 (net 45,00,000 after advance recovery)', byname['Foundation']['status'] == 'Completed' and byname['Foundation']['billed'] and byname['Foundation']['billNumber'] == 'INV-APEX-001' and byname['Foundation']['netBillAmount'] == 4500000 and byname['Foundation']['siteReportIds'] == ['R001'], byname['Foundation'])
check('Structure: not billable yet (tasks unfinished, not approved)', byname['Structure']['billable'] is False and byname['Structure']['status'] != 'Completed')
r001 = must(call('GET', 'reports/R001', token=PM))
check('R001 is linked to Foundation and T001 with weather, labor and issued stock', r001['milestoneId'] == 'MS001' and r001['taskId'] == 'T001' and r001['weather'] == 'Sunny' and r001['laborCount'] == 22 and r001['materials'][0]['qty'] == 20)

scene('SEEDED P001: finish Structure through the live flow and bill it; the advance + stage bills equal the contract')
must(call('PATCH', 'tasks/T002', {'status': 'Completed', 'progress': 100}, SE))
check('Structure cannot be approved without a linked site report', (lambda r: r[0] == 400 and 'site report' in json.dumps(r[1]))(call('POST', 'milestones/MS002/approve', token=PM)))
must(call('POST', 'reports', {'title': 'Structure complete', 'projectId': 'P001', 'projectName': p1['name'], 'submittedBy': 'U003', 'date': iso(TODAY), 'progress': 0, 'status': 'Completed', 'workDone': 'Steel framework and RCC structure complete', 'priority': 'Low', 'materials': [], 'photos': 0, 'milestoneId': 'MS002', 'taskId': 'T002', 'weather': 'Cloudy', 'laborCount': 31}, SE))
check('with the task done and a report, the PM approves Structure', must(call('POST', 'milestones/MS002/approve', token=PM))['status'] == 'Completed')
sb = must(call('POST', 'bills', {'projectId': 'P001', 'milestoneId': 'MS002'}, FM))
check('Structure bill = 2,62,50,000 less 10% advance recovery 26,25,000 = 2,36,25,000', sb['amount'] == 23625000 and sb['stageAmount'] == 26250000 and sb['advanceRecovery'] == 2625000, sb)
live1 = [b for b in must(call('GET', 'bills', token=FM)) if b['projectId'] == 'P001' and b['status'] != 'Declined']
check('advance 31,25,000 + Foundation 45,00,000 + Structure 2,36,25,000 = contract value 3,12,50,000', sum(b['amount'] for b in live1) == 31250000, [(b['billNumber'], b['amount']) for b in live1])
check('P001 is now 100% physically complete with both milestones approved', must(call('GET', 'milestones/progress/P001', token=PM))['milestoneCompletion'] == 100)

scene('FM report preview access and the project team list (client workspace chat)')
CA = login('client1@gmail.com'); CLT = login('client2@gmail.com')
check('FM of P001 can read the site report attached to the bill', call('GET', 'reports/R001', token=FM)[0] == 200)
check("another company's FM cannot read it", call('GET', 'reports/R001', token=FM2)[0] == 403)
fm_reports = must(call('GET', 'reports', token=FM)); fm_projects = {p['id'] for p in must(call('GET', 'projects', token=FM))}
check('FM report list is limited to the projects they run', 'R001' in {r['id'] for r in fm_reports} and all(r['projectId'] in fm_projects for r in fm_reports) and not {'R003', 'R004'} & {r['id'] for r in fm_reports}, [(r['id'], r['projectId']) for r in fm_reports])
check('other FM list only has their own projects reports', {r['id'] for r in must(call('GET', 'reports', token=FM2))} == {'R003', 'R004'})
team = must(call('GET', 'tasks/team/P001', token=CA))
check('client of P001 sees its team: PM, FM and the site engineer (id, name, role only)', {m['id'] for m in team} == {'U002', 'U003', 'U004'} and all(set(m) == {'id', 'name', 'role'} for m in team), team)
check('the team never includes other staff (storekeeper, admin, other roles)', all(m['role'] in ('project_manager', 'finance_manager', 'site_engineer') for m in team))
check("another client cannot read P001's team", call('GET', 'tasks/team/P001', token=CLT)[0] == 404)
check("another company's PM cannot read it either", call('GET', 'tasks/team/P001', token=PM2)[0] == 404)
check('company staff can read the team of their project', call('GET', 'tasks/team/P001', token=PM)[0] == 200)

print('\nLIFECYCLE ALL PASS' if ok else '\nLIFECYCLE SOME FAILED')
sys.exit(0 if ok else 1)
