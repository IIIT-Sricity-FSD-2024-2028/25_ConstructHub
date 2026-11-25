"""Step 4 milestones & progress smoke test. Fresh data/db first, then:  API=http://localhost:3000 python3 tests/api/step4-smoke-test.py [phase2]"""
import json, os, sys, urllib.request, urllib.error, datetime
B = os.environ.get('API', 'http://localhost:3000')
TODAY = datetime.date.today(); iso = lambda d: d.isoformat()
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
    if not cond: print('FAIL ' + name, str(extra)[:300])
    ok = ok and cond
def login(e, p='123456'):
    s, d = call('POST', 'auth/login', {'email': e, 'password': p}); assert s == 200, (e, s, d); return d['accessToken']
AD1=login('admin@apex.com'); PM1=login('pm@apex.com'); SE1=login('site@apex.com'); FM1=login('finance@apex.com')
C1=login('client1@gmail.com'); C2=login('client3@gmail.com'); C3=login('client2@gmail.com')
AD2=login('admin@ltinfra.com'); PM2=login('pm@ltinfra.com'); SE2=login('site@ltinfra.com'); FM2=login('finance@ltinfra.com')
prog = lambda tok, pid: call('GET', f'milestones/progress/{pid}', token=tok)
proj = lambda tok, pid: call('GET', f'projects/{pid}', token=tok)[1]

if len(sys.argv) > 1 and sys.argv[1] == 'phase2':
    s, d = prog(PM1, 'P002'); check('milestones persisted', s == 200 and d['milestonesTotal'] == 1 and d['weightAllocated'] == 50, d)
    check('derived progress persisted on project', proj(AD1, 'P002')['progress'] == d['physicalProgress'], (proj(AD1,'P002')['progress'], d['physicalProgress']))
    np = [p for p in call('GET','projects',token=AD2)[1] if p['name'] == 'SMOKE manual project'][0]
    s, d = prog(PM2, np['id']); check('manual mode persisted after deleting milestones', d['mode'] == 'manual' and np['progress'] == 55, (d, np))
    print('PHASE2 ALL PASS' if ok else 'PHASE2 SOME FAILED'); sys.exit(0 if ok else 1)

# ---- 1. auth required on every route
for m, p in [('GET','milestones'),('POST','milestones'),('GET','milestones/MS001'),('PATCH','milestones/MS001'),('DELETE','milestones/MS001'),
             ('POST','milestones/MS001/approve'),('POST','milestones/MS001/reopen'),('GET','milestones/progress/P001')]:
    check(f'{m} /{p} needs auth', call(m, p, {} if m != 'GET' else None)[0] == 401)

# ---- 2. seeded milestones + derived progress
s, d = prog(AD1, 'P001')
check('P001 physical progress is weighted (40%x100 + 60%x0 = 40)', s == 200 and d['physicalProgress'] == 40 and d['mode'] == 'milestones' and d['weightAllocated'] == 100, d)
check('P001 milestone completion is separate (1 of 2 approved)', d['milestoneCompletion'] == 50 and d['milestonesApproved'] == 1 and d['milestonesTotal'] == 2, d)
check('only the open overdue milestone is flagged as delayed (the approved one is not)', d['delayedMilestones'] == 1 and [m['name'] for m in d['milestones'] if m['delayed']] == ['Structure'] and all(m['daysLate'] > 0 for m in d['milestones'] if m['delayed']), d['milestones'])
check('project record carries derived progress (old pages keep working)', proj(AD1, 'P001')['progress'] == 40, proj(AD1,'P001'))
s, d = prog(AD1, 'P002'); check('P002 = 50%x100 (MS003 approved and billed) + 50%x0 = 50', d['physicalProgress'] == 50 and d['milestonesApproved'] == 1, d)
s, d = prog(AD2, 'P004'); ms7 = [m for m in d['milestones'] if m['id']=='MS007'][0]
check('seeded billed milestone MS007 is approved (30%x100 + 70%x0 = 30)', ms7['status'] == 'Completed' and ms7['progress'] == 100 and d['milestonesApproved'] == 1 and d['physicalProgress'] == 30, d)

# ---- 3. read access
check('client reads own project progress', prog(C1, 'P001')[0] == 200)
check("client cannot read another client's project", prog(C1, 'P002')[0] == 404)
check('other client reads their own', prog(C2, 'P002')[0] == 200)
check('client sees milestones without internal task data', all('tasks' not in m for m in call('GET','milestones?projectId=P002',token=C2)[1]) and 'tasks' not in call('GET','milestones/MS003',token=C2)[1])
check('company staff read', prog(SE1, 'P001')[0] == 200 and prog(PM1, 'P001')[0] == 200)
check('finance manager reads own project', prog(FM1, 'P001')[0] == 200)
check('other company cannot read', prog(PM2, 'P001')[0] == 404 and prog(FM2, 'P001')[0] == 404 and prog(AD2, 'P001')[0] == 404)
s, d = call('GET', 'milestones', token=SE1); check('company-wide list scoped to company', s == 200 and d and all(m['companyId'] == 'COMP001' for m in d), d)
s, d = call('GET', 'milestones', token=C1); check('client list scoped to own projects', d and all(m['projectId'] == 'P001' for m in d), d)
check('unknown project 404', prog(AD1, 'P999')[0] == 404)

# ---- 4. write permissions
new = {'projectId': 'P002', 'name': 'Handover', 'deadline': iso(TODAY + datetime.timedelta(days=60)), 'weight': 10}
check('client cannot create', call('POST','milestones',new,C2)[0] == 403)
check('site engineer cannot create', call('POST','milestones',new,SE1)[0] == 403)
check('finance manager cannot create', call('POST','milestones',new,FM1)[0] == 403)
check("other company's PM cannot create", call('POST','milestones',new,PM2)[0] == 404)
check('platform admin cannot create', call('POST','milestones',new,login('super@ch.com'))[0] == 403)
check('weights over 100 rejected with a helpful message', (lambda r: r[0] == 400 and 'at most 0%' in json.dumps(r[1]))(call('POST','milestones',new,PM1)), call('POST','milestones',new,PM1))
s, d = call('PATCH', 'milestones/MS004', {'weight': 30}, PM1); check('PM lowers a weight', s == 200 and d['weight'] == 30, (s, d))
check('weight 21 would exceed 100', call('POST','milestones',{**new,'weight':21},PM1)[0] == 400)
check('duplicate name rejected (case-insensitive)', call('POST','milestones',{**new,'name':'FINISHING','weight':5},PM1)[0] == 409)
check('deadline before project start rejected', call('POST','milestones',{**new,'deadline':'2020-01-01'},PM1)[0] == 400)
check('bad weight type rejected', call('POST','milestones',{**new,'weight':0},PM1)[0] == 400 and call('POST','milestones',{**new,'weight':'x'},PM1)[0] == 400)
check('short name rejected', call('POST','milestones',{**new,'name':'ab'},PM1)[0] == 400)
s, hand = call('POST', 'milestones', new, PM1); check('PM creates milestone', s == 201 and hand['status'] == 'Pending' and hand['delayed'] is False and hand['weight'] == 10, (s, hand)); HID = hand['id']
check('weight allocation now 90%', prog(PM1,'P002')[1]['weightAllocated'] == 90)
check('PM edits milestone', call('PATCH',f'milestones/{HID}',{'weight':20,'name':'Final handover'},PM1)[1]['weight'] == 20)
check('other company cannot edit', call('PATCH',f'milestones/{HID}',{'weight':1},PM2)[0] in (403, 404))
check('empty milestone cannot be approved', (lambda r: r[0] == 400 and 'at least one task' in json.dumps(r[1]))(call('POST',f'milestones/{HID}/approve',token=PM1)))

# ---- 5. task integrity
task = {'title':'Tile work','projectId':'P002','projectName':'Apex Commercial Complex','assignedTo':'U003','priority':'Medium','status':'Pending','progress':0,'startDate':iso(TODAY),'deadline':iso(TODAY+datetime.timedelta(days=20)),'description':'Floor tiling','milestoneId':'MS004'}
s, t1 = call('POST','tasks',task,PM1); check('PM creates task inside milestone', s == 201 and t1['milestoneId'] == 'MS004', (s,t1)); T1 = t1['id']
d = prog(PM1,'P002')[1]; ms4 = [m for m in d['milestones'] if m['id']=='MS004'][0]
check('milestone counts the new task', ms4['taskCount'] == 1 and ms4['progress'] == 0, ms4)
check("task cannot point at another project's milestone", call('POST','tasks',{**task,'title':'Wrong ms','milestoneId':'MS001'},PM1)[0] == 400)
check('task cannot use unknown milestone', call('POST','tasks',{**task,'title':'Ghost ms','milestoneId':'MS999'},PM1)[0] == 400)
check("other company's PM cannot file tasks under our project", call('POST','tasks',{**task,'title':'Intruder','assignedTo':'U008'},PM2)[0] == 403)
check('completed task must be 100%', call('PATCH',f'tasks/{T1}',{'status':'Completed','progress':90},SE1)[0] == 400)
check('100% task must be Completed', call('PATCH',f'tasks/{T1}',{'status':'In Progress','progress':100},SE1)[0] == 400)
s, d = call('PATCH',f'tasks/{T1}',{'status':'In Progress','progress':50,'remarks':'half way','title':'HACKED','milestoneId':'MS003','priority':'Low'},SE1)
check('SE updates status/progress/remarks only (other fields ignored)', s == 200 and d['progress'] == 50 and d['title'] == 'Tile work' and d['milestoneId'] == 'MS004' and d['priority'] == 'Medium', (s,d))
d = prog(PM1,'P002')[1]
check('P002 physical = 50%x100 + 30%x50 + 20%x0 = 65', d['physicalProgress'] == 65 and proj(AD1,'P002')['progress'] == 65, d)
check('a task of a milestone project must have a milestone', call('POST','tasks',{**task,'title':'No milestone','milestoneId':None},PM1)[0] == 400)
s, tx = call('POST','tasks',{**task,'title':'Not mine','assignedTo':'U004'},PM1); check('PM creates a task for someone else', s == 201, (s,tx))
check("SE cannot update someone else's task", call('PATCH',f"tasks/{tx['id']}",{'progress':10,'status':'In Progress'},SE1)[0] == 403)
check("other company's SE cannot update our task", call('PATCH',f'tasks/{T1}',{'progress':10,'status':'In Progress'},SE2)[0] in (403, 404))

# ---- 6. approval workflow
check('cannot approve while tasks unfinished', (lambda r: r[0] == 400 and '0 of 2' in json.dumps(r[1]))(call('POST','milestones/MS004/approve',token=PM1)), call('POST','milestones/MS004/approve',token=PM1))
s, d = call('PATCH',f'tasks/{T1}',{'status':'Completed','progress':100},SE1); check('SE finishes task', s == 200)
call('PATCH',f"tasks/{tx['id']}",{'status':'Completed','progress':100},PM1)
d = prog(PM1,'P002')[1]; check('milestone is Ready for Review; completion still 1 of 3', [m for m in d['milestones'] if m['id']=='MS004'][0]['status'] == 'Ready for Review' and d['milestoneCompletion'] == 33 and d['physicalProgress'] == 80, d)
check('MS003 is already approved -> 409', call('POST','milestones/MS003/approve',token=PM1)[0] == 409)
check('site engineer cannot approve', call('POST','milestones/MS004/approve',token=SE1)[0] == 403)
check('client cannot approve', call('POST','milestones/MS004/approve',token=C2)[0] == 403)
check('other company cannot approve', call('POST','milestones/MS004/approve',token=PM2)[0] in (403, 404))
check('approval needs at least one linked site report (evidence)', (lambda r: r[0] == 400 and 'site report' in json.dumps(r[1]))(call('POST','milestones/MS004/approve',token=PM1)))
call('POST','reports',{'title':'MS004 evidence','projectId':'P002','submittedBy':'U002','date':iso(TODAY),'progress':100,'status':'Completed','workDone':'Finishing complete','priority':'Low','materials':[],'photos':0,'milestoneId':'MS004','weather':'Sunny','laborCount':8},PM1)
s, d = call('POST','milestones/MS004/approve',token=PM1); check('PM approves milestone', s == 201 and d['status'] == 'Completed' and d['approvedBy'] == 'U002', (s,d))
d = prog(PM1,'P002')[1]; check('milestone completion now 2 of 3 = 67%', d['milestoneCompletion'] == 67 and d['milestonesApproved'] == 2, d)
n = call('GET','notifications',token=C2)[1]; check('client notified of approved milestone', any(x['title'] == 'Milestone completed' for x in n), n[:2])
check('approve twice -> 409', call('POST','milestones/MS004/approve',token=PM1)[0] == 409)
check('approved milestone cannot be edited', call('PATCH','milestones/MS004',{'weight':5},PM1)[0] == 409)
check('approved milestone cannot be deleted', call('DELETE','milestones/MS004',token=PM1)[0] == 409)
check('cannot add tasks to an approved milestone', call('POST','tasks',{**task,'title':'Late addition'},PM1)[0] == 409)
s, d = call('PATCH',f'tasks/{T1}',{'status':'In Progress','progress':80},SE1)
check('tasks of an approved milestone are frozen (reopen first)', s == 409, (s, d))
check('the approved milestone stays approved', [m for m in prog(PM1,'P002')[1]['milestones'] if m['id']=='MS004'][0]['status'] == 'Completed')
check('a billed milestone cannot be reopened', call('POST','milestones/MS003/reopen',token=PM1)[0] == 409)
s, d = call('POST','milestones/MS004/reopen',token=PM1); check('PM reopens approved milestone', s == 201 and d['status'] == 'Ready for Review' and not d.get('approvedAt'), (s,d))
check('cannot reopen a milestone that is not approved', call('POST','milestones/MS004/reopen',token=PM1)[0] == 400)

# ---- 7. project-level controls
before = proj(AD1,'P002')['progress']
s, d = call('PATCH','projects/P002',{'progress':99},PM1); check('typed-in progress is ignored for milestone projects', proj(AD1,'P002')['progress'] == before, (s, d))
s, d = call('PATCH','projects/P002',{'progress':100,'status':'Completed'},PM1); check('cannot mark project completed while progress < 100', s == 400, (s,d))
s, d = call('PATCH','projects/P002',{'description':'Updated description text'},PM1); check('other project edits still work', s == 200 and d['description'] == 'Updated description text', (s,d))

# ---- 8. deleting
s, d = call('DELETE',f'milestones/{HID}',token=PM1); check('PM deletes empty milestone', s == 200)
check('weights freed after delete', prog(PM1,'P002')[1]['weightAllocated'] == 80)
check('a billed milestone cannot be deleted', call('DELETE','milestones/MS003',token=PM1)[0] == 409)
check('tasks and site reports of an approved milestone cannot be deleted', call('DELETE','tasks/T003',token=PM1)[0] == 409 and call('DELETE','reports/R002',token=PM1)[0] == 409)
s, d = call('DELETE','milestones/MS004',token=PM1); check('deleting a milestone keeps its tasks', s == 200, (s, d))
tasks = call('GET','tasks',token=PM1)[1]; t4 = [t for t in tasks if t['id'] in (T1, tx['id'])]
check('tasks of deleted milestone are unassigned, not deleted', len(t4) == 2 and all(t.get('milestoneId') in (None,) for t in t4), t4)
d = prog(PM1,'P002')[1]; check('progress recalculated after delete (only MS003 left: 50%x100)', d['physicalProgress'] == 50, d)
check('deleting an unassigned task keeps progress', call('DELETE',f'tasks/{T1}',token=PM1)[0] == 200 and prog(PM1,'P002')[1]['physicalProgress'] == 50)

# ---- 9. dynamic delay detection + back to manual mode
s, fut = call('POST','milestones',{'projectId':'P003','name':'Future milestone','deadline':iso(TODAY+datetime.timedelta(days=30)),'weight':0+1},PM2)
check('weights full on P003 so extra milestone rejected', s == 400, (s,fut))
call('PATCH','milestones/MS006',{'weight':40},PM2)
s, fut = call('POST','milestones',{'projectId':'P003','name':'Future milestone','deadline':iso(TODAY+datetime.timedelta(days=30)),'weight':10},PM2)
check('future milestone is not delayed', s == 201 and fut['delayed'] is False and fut['daysLate'] == 0, (s,fut))
check('the approved, billed MS005 cannot be deleted', call('DELETE','milestones/MS005',token=PM2)[0] == 409)
# manual mode: a fresh project whose only milestone is removed again
np = {'name':'SMOKE manual project','location':'Chennai','clientId':'U010','clientName':'Anand Mahindra','managerId':'U007','financeManagerId':'U009','budget':1000000,'progress':0,'status':'On Track','startDate':iso(TODAY),'endDate':iso(TODAY+datetime.timedelta(days=90)),'teamSize':3,'allocations':{'Other':1000000},'description':'Manual progress project'}
check('a company admin cannot create projects by hand (they come from awarded quotations)', call('POST','projects',np,AD2)[0] == 403)
check('a project manager cannot create projects by hand', call('POST','projects',np,PM2)[0] == 403)
s, npr = call('POST','projects',{**np,'companyId':'COMP002'},login('super@ch.com')); check('platform admin creates a test project', s == 201, (s, npr)); NPID = npr['id']
s, m1 = call('POST','milestones',{'projectId':NPID,'name':'Only stage','deadline':iso(TODAY+datetime.timedelta(days=30)),'weight':100},PM2)
check('milestone mode on', prog(PM2,NPID)[1]['mode'] == 'milestones', m1)
call('DELETE',f"milestones/{m1['id']}",token=PM2)
d = prog(PM2,NPID)[1]; check('no milestones left -> manual progress mode', d['mode'] == 'manual' and d['milestonesTotal'] == 0, d)
s, d = call('PATCH',f'projects/{NPID}',{'progress':55},PM2); check('manual progress can be typed in again', s == 200 and d['progress'] == 55, (s,d))
check('a site engineer cannot lower or set status on a project', call('PATCH',f'projects/{NPID}',{'progress':60,'status':'Completed'},login('site@ltinfra.com'))[0] == 403)
for mid in [fut['id']]: call('DELETE',f'milestones/{mid}',token=PM2)

print('PHASE1 ALL PASS' if ok else 'PHASE1 SOME FAILED')
sys.exit(0 if ok else 1)
