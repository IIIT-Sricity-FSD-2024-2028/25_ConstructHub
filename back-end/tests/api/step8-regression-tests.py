"""
Regression tests for the bugs found in the logic review (B1-B14) and the extra ones found while fixing them (B15-B21).
Each check tries the attack that used to work and expects it to be refused now; a few also confirm the legitimate path still works.
Fresh data/db first, then:   API=http://localhost:3000 python3 tests/api/step8-regression-tests.py
"""
import json, os, sys, urllib.request, urllib.error, datetime, uuid
B = os.environ.get('API', 'http://localhost:3000')
TODAY = datetime.date.today()


def call(method, path, body=None, token=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(B + '/' + path, method=method, data=data)
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
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else ' -> ' + str(extra)[:300]))
    ok = ok and bool(cond)

def login(e, p='123456'):
    s, d = call('POST', 'auth/login', {'email': e, 'password': p}); assert s == 200, (e, s, d); return d['accessToken']

SU = login('super@ch.com'); AD = login('admin@apex.com'); PM = login('pm@apex.com'); SE = login('site@apex.com')
FM = login('finance@apex.com'); PR = login('proc@apex.com'); AD2 = login('admin@ltinfra.com'); PM2 = login('pm@ltinfra.com')
C1 = login('client1@gmail.com'); C3 = login('client3@gmail.com')

# ---------------- B1  inquiry delete
s, d = call('POST', 'inquiries', {'name': 'Regression Test', 'email': 'reg@test.com', 'phone': '9876543210', 'company': 'RegCo', 'message': 'Please delete me after the test run.'})
check('B1 public inquiry still accepted', s == 201, (s, d))
IQ = d['id']
check('B1 company staff cannot delete inquiries (403)', call('DELETE', f'inquiries/{IQ}', token=AD)[0] == 403)
s, d = call('DELETE', f'inquiries/{IQ}', token=SU); check('B1 superuser can delete an inquiry', s in (200, 204), (s, d))
check('B1 the inquiry is really gone', all(i['id'] != IQ for i in call('GET', 'inquiries', token=SU)[1]))

# ---------------- B2/B3  other people's accounts
s, d = call('PATCH', 'users/U001', {'password': 'hacked123'}, SE); check("B2 site engineer cannot change the admin's password", s == 403, (s, d))
check('B2 admin password unchanged', call('POST', 'auth/login', {'email': 'admin@apex.com', 'password': 'hacked123'})[0] == 401)
check("B2 project manager cannot change a colleague's password", call('PATCH', 'users/U003', {'password': 'hacked123'}, PM)[0] == 403)
s, d = call('PATCH', 'users/U001', {'status': 'inactive'}, SE); check('B3 site engineer cannot deactivate the admin', s == 403, (s, d))
check('B3 nobody can deactivate their own account', call('PATCH', 'users/U003', {'status': 'inactive'}, SE)[0] == 400 and call('PATCH', 'users/U001', {'status': 'inactive'}, AD)[0] == 400)
check('B3 a user cannot change their own role', call('PATCH', 'users/U003', {'role': 'company_admin'}, SE)[0] in (400, 403))
s, d = call('PATCH', 'users/U003', {'status': 'inactive'}, AD); check('B3 company admin can still lock a staff account', s == 200 and d['status'] == 'inactive', (s, d))
call('PATCH', 'users/U003', {'status': 'active'}, AD)

# ---------------- B4  role escalation on create
s, d = call('POST', 'users', {'name': 'Evil Admin', 'email': 'evil@apex.com', 'password': 'x1234567', 'role': 'company_admin'}, PM)
check('B4 project manager cannot create a company admin', s == 403, (s, d))
check('B4 project manager cannot create staff either', call('POST', 'users', {'name': 'Evil Eng', 'email': 'evileng@apex.com', 'password': 'x1234567', 'role': 'site_engineer'}, PM)[0] == 403)
check('B4 project manager cannot create client accounts either (clients sign up themselves)', call('POST', 'users', {'name': 'Rita Client', 'email': 'rita.client@gmail.com', 'password': 'x1234567', 'role': 'client'}, PM)[0] == 403)
s, d = call('POST', 'users', {'name': 'Rita Engineer', 'email': 'rita@apex.com', 'password': 'x1234567', 'role': 'site_engineer'}, AD)
check('B4 company admin can still create staff', s == 201 and d['role'] == 'site_engineer' and d['companyId'] == 'COMP001', (s, d))
check('B4 company admin cannot create another company admin', call('POST', 'users', {'name': 'Admin Two', 'email': 'admin2@apex.com', 'password': 'x1234567', 'role': 'company_admin'}, AD)[0] == 403)

# ---------------- B15  password hashes are never returned
check('B15 created user response has no password hash', 'password' not in d, d)
s, d = call('PATCH', 'users/U003', {'name': 'Priya Sharma'}, SE); check('B15 updated user response has no password hash', s == 200 and 'password' not in d, (s, d))
check('B15 a ready-made bcrypt hash is refused as a password', call('PATCH', 'users/U003', {'password': '$2b$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz12345', 'currentPassword': '123456'}, SE)[0] == 400)

# ---------------- B6  password rules
check('B6 a 1-character password is refused', call('PATCH', 'users/U003', {'password': '1', 'currentPassword': '123456'}, SE)[0] == 400)
check('B6 own password change needs the current password', call('PATCH', 'users/U003', {'password': 'newpass123'}, SE)[0] == 400)
check('B6 wrong current password is refused', call('PATCH', 'users/U003', {'password': 'newpass123', 'currentPassword': 'wrong'}, SE)[0] == 400)
s, d = call('PATCH', 'users/U003', {'password': 'newpass123', 'currentPassword': '123456'}, SE)
check('B6 correct current password changes it', s == 200 and call('POST', 'auth/login', {'email': 'site@apex.com', 'password': 'newpass123'})[0] == 200, (s, d))
s, d = call('PATCH', 'users/U003', {'password': '123456'}, AD); check('B6 admin can reset a staff password without the old one', s == 200, (s, d))
SE = login('site@apex.com')
check('B6 profile edit of own name and 10-digit phone works', call('PATCH', 'users/U003', {'name': 'Priya Sharma', 'phone': '9876543211'}, SE)[0] == 200)

# ---------------- B14  deleting a user still on a project
s, d = call('DELETE', 'users/U002', token=AD); check('B14 a project manager still on projects cannot be deleted', s == 409, (s, d))

# ---------------- B5  project edits by role
check('B5 site engineer cannot overwrite project.spent', call('PATCH', 'projects/P001', {'spent': 0}, SE)[0] in (400, 403))
before = call('GET', 'projects/P001', token=AD)[1]['spent']; call('PATCH', 'projects/P001', {'spent': 1, 'description': 'Luxury residential high-rise in South Mumbai.'}, AD)
check('B5 spent cannot be typed in even by the admin', call('GET', 'projects/P001', token=AD)[1]['spent'] == before)
check('B5 storekeeper cannot edit projects', call('PATCH', 'projects/P001', {'name': 'X'}, PR)[0] == 403)
check('B5 site engineer cannot reassign the finance manager', call('PATCH', 'projects/P001', {'financeManagerId': 'U004'}, SE)[0] == 403)
check('B5 finance manager cannot change the project team', call('PATCH', 'projects/P001', {'managerId': 'U002'}, FM)[0] == 403)
check("B5 another company's PM cannot edit", call('PATCH', 'projects/P001', {'description': 'hack'}, PM2)[0] == 403)
s, d = call('PATCH', 'projects/P001', {'description': 'Luxury residential high-rise in South Mumbai.'}, PM); check('B5 the project manager can still edit own project', s == 200, (s, d))

# ---------------- B7/B8  bill edits
s, d = call('PATCH', 'bills/B001', {'amount': 999999999}, FM); check('B8 a stage bill amount cannot be edited', s == 400, (s, d))
check('B8 project manager cannot edit bills at all', call('PATCH', 'bills/B001', {'description': 'x'}, PM)[0] == 403)
check('B8 bill client cannot be re-pointed', call('PATCH', 'bills/B001', {'clientId': 'U010'}, FM)[0] == 400)
s, d = call('PATCH', 'bills/B001', {'dueDate': (TODAY + datetime.timedelta(days=20)).isoformat(), 'description': 'Foundation stage bill.'}, FM)
check('B8 FM can still fix wording and due date of a pending bill', s == 200 and d['amount'] == 4500000, (s, d))
s, d = call('PATCH', 'bills/B001', {'status': 'Accepted'}, C1); check('client accepts B001', s == 200 and d['status'] == 'Accepted', (s, d))
check('B7 company admin cannot change an ACCEPTED bill', call('PATCH', 'bills/B001', {'description': 'changed'}, AD)[0] == 409)
check('B7 finance manager cannot change an ACCEPTED bill', call('PATCH', 'bills/B001', {'dueDate': '2030-01-01'}, FM)[0] == 409)
check('B7 an accepted bill cannot be deleted', call('DELETE', 'bills/B001', token=FM)[0] == 409)
check('B7 the mobilization advance bill cannot be deleted', call('DELETE', 'bills/B005', token=AD)[0] == 409)
check('B7 client cannot decide twice', call('PATCH', 'bills/B001', {'status': 'Declined'}, C1)[0] == 409)

# ---------------- B9  client payments
s, d = call('POST', 'bills/B001/payments', {'amount': 1000, 'method': 'Cash', 'reference': 'x'}, C1)
check('B9 client cannot self-report Cash; reference comes from the server', s == 201 and d['payment']['method'] == 'Online payment (demo)' and d['payment']['reference'].startswith('DEMO-'), (s, d))
s, d = call('POST', 'bills/B001/payments', {'amount': 1000, 'method': 'UPI', 'reference': 'vikram@okbank'}, C1)
check('B9 portal method kept, payer id stored separately', s == 201 and d['payment']['method'] == 'UPI' and d['payment']['reference'].startswith('DEMO-') and d['payment']['payerReference'] == 'vikram@okbank', (s, d))

# ---------------- B10  free-form bills on a project without milestones
np = {'name': 'REG no-plan project', 'location': 'Pune', 'clientId': 'U005', 'clientName': 'Vikram Patel', 'managerId': 'U002', 'financeManagerId': 'U004',
      'budget': 1000000, 'progress': 0, 'status': 'On Track', 'startDate': TODAY.isoformat(), 'endDate': (TODAY + datetime.timedelta(days=60)).isoformat(),
      'teamSize': 2, 'allocations': {'Other': 1000000}, 'description': 'Small job without milestones', 'spent': 999}
check('B21 company admin cannot create a project by hand', call('POST', 'projects', np, AD)[0] == 403)
check('B21 project manager cannot create a project by hand', call('POST', 'projects', np, PM)[0] == 403)
s, prj = call('POST', 'projects', {**np, 'companyId': 'COMP001'}, SU); check('platform admin creates a test project (spent forced to 0)', s == 201 and prj['spent'] == 0, (s, prj)); NP = prj['id']
fb = {'projectId': NP, 'clientId': 'U010', 'amount': 1000, 'milestone': 'Survey', 'description': 'Site survey', 'dueDate': (TODAY + datetime.timedelta(days=10)).isoformat()}
check('B10 project manager cannot raise bills', call('POST', 'bills', fb, PM)[0] == 403)
check("B10 another company's FM cannot bill this project", call('POST', 'bills', fb, login('finance@ltinfra.com'))[0] in (400, 403, 404))
s, d = call('POST', 'bills', fb, FM); check("B10 FM's free-form bill goes to the project's own client", s == 201 and d['clientId'] == 'U005' and d['companyId'] == 'COMP001', (s, d))
FB = d['id']
check('B10/B8 free-form amount still capped on edit', call('PATCH', f'bills/{FB}', {'amount': 999999999}, FM)[0] == 400)
check('B10 free-form amount can change within the cap', call('PATCH', f'bills/{FB}', {'amount': 2000}, FM)[1].get('amount') == 2000)
check('a pending bill can be deleted by its FM', call('DELETE', f'bills/{FB}', token=FM)[0] == 200)

# ---------------- B11  deleting projects with money on them
s, d = call('DELETE', 'projects/P002', token=PM); check('B11 a project with bills and payments cannot be deleted', s == 409, (s, d))
check('B11 its bills, payments and client are untouched', any(b['projectId'] == 'P002' for b in call('GET', 'bills', token=SU)[1]) and call('GET', 'users/U011', token=SU)[0] == 200)
check("B11 a PM cannot delete another PM's project", call('DELETE', f'projects/{NP}', token=PM2)[0] == 403)
s, t = call('POST', 'tasks', {'title': 'Survey', 'projectId': NP, 'projectName': np['name'], 'assignedTo': 'U003', 'priority': 'Low', 'status': 'Pending', 'progress': 0, 'startDate': TODAY.isoformat(), 'deadline': (TODAY + datetime.timedelta(days=5)).isoformat(), 'description': 'Survey the site'}, PM)
s2, d = call('DELETE', f'projects/{NP}', token=AD); check('B11 an empty project can be deleted, with its tasks', s2 == 200 and all(x['id'] != t['id'] for x in call('GET', 'tasks', token=AD)[1]), (s, t, s2, d))

# ---------------- B12/B13  billed milestones
check('B13 seeded billed milestones are approved', all(call('GET', f'milestones/{m}', token=SU)[1]['status'] == 'Completed' for m in ('MS001', 'MS003')) and call('GET', 'milestones/MS005', token=SU)[1]['status'] == 'Completed' and call('GET', 'milestones/MS007', token=SU)[1]['status'] == 'Completed')
check('B13 seed stage bills match the quoted stage amounts', all(b['stageAmount'] == call('GET', f"milestones/{b['milestoneId']}", token=SU)[1]['clientStageAmount'] for b in call('GET', 'bills', token=SU)[1] if b.get('milestoneId')))
check('B12 a billed milestone cannot be reopened', call('POST', 'milestones/MS001/reopen', token=PM)[0] == 409)
check('B12 a billed milestone cannot be deleted', call('DELETE', 'milestones/MS003', token=PM)[0] == 409)
check('B12 tasks of an approved milestone are frozen', call('PATCH', 'tasks/T001', {'status': 'In Progress', 'progress': 50}, SE)[0] == 409 and call('DELETE', 'tasks/T001', token=PM)[0] == 409)
check('B12 the evidence report of a billed milestone cannot be deleted or edited', call('DELETE', 'reports/R001', token=PM)[0] == 409 and call('PATCH', 'reports/R001', {'workDone': 'changed'}, PM)[0] == 409)

# ---------------- B16  business dates use India time
s, h = call('GET', 'health')
ist = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=5, minutes=30)).date().isoformat()
s, ms = call('GET', 'milestones?projectId=P001', token=SE)
s, d = call('POST', 'expenses', {'projectId': 'P001', 'milestoneId': 'MS002', 'category': 'Transport', 'amount': 500, 'date': ist, 'description': 'Taxi to the site today'}, SE)
check("B16 an expense dated today (India time) is accepted at any hour", s == 201, (s, d))

# ---------------- B17  messages are private
s, d = call('POST', 'messages', {'receiverId': 'U006', 'text': 'cross company'}, SE); check('B17 cannot message another company', s == 403, (s, d))
s, d = call('POST', 'messages', {'receiverId': 'U004', 'senderId': 'U001', 'senderName': 'Apex Admin', 'text': 'private note to finance'}, SE)
check('B17 sender cannot be faked', s == 201 and d['senderId'] == 'U003' and d['from'] == 'U003', (s, d)); MID = d['id']
check('B17 colleagues outside the conversation cannot read it', all(m['id'] != MID for m in call('GET', 'messages', token=PM)[1]) and call('GET', f'messages/{MID}', token=PM)[0] == 403)
check('B17 the receiver can read it', any(m['id'] == MID for m in call('GET', 'messages', token=FM)[1]))
check('B17 nobody else can edit or delete it', call('PATCH', f'messages/{MID}', {'text': 'tampered'}, PM)[0] == 403 and call('DELETE', f'messages/{MID}', token=FM)[0] == 403)
check('B17 a client can message their project team', call('POST', 'messages', {'receiverId': 'U002', 'text': 'Hello from the client'}, C1)[0] == 201)

# ---------------- B18  notifications are private
n = [x for x in call('GET', 'notifications', token=FM)[1]]
if n:
    check("B18 cannot read a colleague's notification", call('GET', f"notifications/{n[0]['id']}", token=SE)[0] == 403)
    check("B18 cannot mark a colleague's notification read", call('PATCH', f"notifications/{n[0]['id']}", {'read': True}, SE)[0] == 403)
check('B18 cannot notify another company', call('POST', 'notifications', {'userId': 'U006', 'title': 'x', 'body': 'x', 'message': 'x'}, SE)[0] == 400)
check('B18 can notify a colleague', call('POST', 'notifications', {'userId': 'U002', 'title': 'Report submitted', 'body': 'x', 'message': 'x'}, SE)[0] == 201)

# ---------------- B19  PM scope on tasks
check("B19 a PM cannot create tasks on another company's project", call('POST', 'tasks', {'title': 'x', 'projectId': 'P001', 'assignedTo': 'U008', 'priority': 'Low', 'status': 'Pending', 'progress': 0, 'startDate': TODAY.isoformat(), 'deadline': TODAY.isoformat(), 'description': 'x', 'milestoneId': 'MS002'}, PM2)[0] in (403, 404))

# ---------------- B22  a site engineer acts only on projects where he has unfinished work
exp = lambda p, m: {'projectId': p, 'milestoneId': m, 'category': 'Transport', 'amount': 300, 'date': TODAY.isoformat(), 'description': 'Auto fare to the site'}
mreq = lambda p: {'projectId': p, 'items': [{'description': 'Cement', 'unit': 'bag', 'quantity': 5}], 'priority': 'Low'}
rep = lambda p, m: {'title': 'Daily log', 'projectId': p, 'date': TODAY.isoformat(), 'progress': 0, 'status': 'In Progress', 'workDone': 'Site cleanup and shuttering', 'priority': 'Low', 'materials': [], 'photos': 0, 'milestoneId': m, 'weather': 'Sunny', 'laborCount': 3, 'submittedBy': 'U003'}
# P002: all of site@apex.com's tasks there are completed
check('B22 no expense claim when all his tasks on the project are completed', call('POST', 'expenses', exp('P002', 'MS004'), SE)[0] == 403)
check('B22 no material request when all his tasks on the project are completed', call('POST', 'material-requests', mreq('P002'), SE)[0] == 403)
check('B22 no site report when all his tasks on the project are completed', call('POST', 'reports', rep('P002', 'MS004'), SE)[0] == 403)
# an engineer with no task at all on P001
s, idle = call('POST', 'users', {'name': 'Bench Engineer', 'email': 'bench@apex.com', 'password': '123456', 'role': 'site_engineer'}, AD)
IDLE = login('bench@apex.com')
check('B22 engineer with no task: expense refused', call('POST', 'expenses', exp('P001', 'MS002'), IDLE)[0] in (403, 404))
check('B22 engineer with no task: material request refused', call('POST', 'material-requests', mreq('P001'), IDLE)[0] in (403, 404))
check('B22 engineer with no task: site report refused (used to be allowed)', call('POST', 'reports', rep('P001', 'MS002'), IDLE)[0] == 403)
check('B22 engineer with no task: cannot report on someone else\'s task', call('POST', 'reports', {**rep('P001', 'MS002'), 'taskId': 'T002'}, IDLE)[0] == 403)
# P001: he still has the unfinished task T002 (Structure)
check('B22 engineer with an unfinished task: expense accepted', call('POST', 'expenses', exp('P001', 'MS002'), SE)[0] == 201)
check('B22 engineer with an unfinished task: material request accepted', call('POST', 'material-requests', mreq('P001'), SE)[0] == 201)
check('B22 engineer with an unfinished task: site report accepted', call('POST', 'reports', rep('P001', 'MS002'), SE)[0] == 201)
# he finishes T002: no new claims, but he can still file the proof the PM needs to approve Structure
check('engineer finishes his last task on P001', call('PATCH', 'tasks/T002', {'status': 'Completed', 'progress': 100}, SE)[0] == 200)
check('B22 after finishing: expense refused', call('POST', 'expenses', exp('P001', 'MS002'), SE)[0] == 403)
check('B22 after finishing: material request refused', call('POST', 'material-requests', mreq('P001'), SE)[0] == 403)
check('B22 after finishing: proof report for the milestone awaiting approval is still accepted', call('POST', 'reports', rep('P001', 'MS002'), SE)[0] == 201)
check('B22 once the PM approves the milestone, no more reports', call('POST', 'milestones/MS002/approve', token=PM)[0] == 201 and call('POST', 'reports', rep('P001', 'MS002'), SE)[0] in (403, 409))

# ---------------- B23  stages of an accepted quotation are part of the contract
check('B23 no milestone can be added to a contract project', call('POST', 'milestones', {'projectId': 'P001', 'name': 'Extra stage', 'deadline': (TODAY + datetime.timedelta(days=30)).isoformat(), 'weight': 1}, PM)[0] == 409)
check('B23 a contract stage cannot be re-weighted, renamed or deleted', call('PATCH', 'milestones/MS004', {'weight': 10}, PM)[0] == 409 and call('PATCH', 'milestones/MS004', {'name': 'Renamed'}, PM)[0] == 409 and call('DELETE', 'milestones/MS004', token=PM)[0] == 409)
pa = call('GET', 'projects/P001', token=PM)[1].get('allowed', {})
check('B23 the project tells the screens what is allowed', pa.get('contractProject') is True and pa.get('canAddMilestones') is False and pa.get('canDelete') is False and pa.get('canManageTasks') is True, pa)

# ---------------- B24  uploads keep only real file types
def upload(path, field, name, mime, content, token):
    boundary = uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + f'\r\n--{boundary}--\r\n'.encode())
    req = urllib.request.Request(B + '/' + path, method='POST', data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}'); req.add_header('Authorization', 'Bearer ' + token)
    try:
        r = urllib.request.urlopen(req); return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read()
s, d = upload('reports/upload', 'photos', 'evil.html', 'image/png', b'<script>alert(1)</script>', SE)
url = (d.get('photoUrls') or [''])[0] if isinstance(d, dict) else ''
check('B24 an .html file sent as an image is stored as an image, not a web page', s in (200, 201) and url.endswith('.png'), (s, d))
if url:
    r = urllib.request.urlopen(B + url if url.startswith('/') else url)
    check('B24 and it is served as an image', 'html' not in r.headers.get('Content-Type', ''), r.headers.get('Content-Type'))

# ---------------- B25  password guessing
call('POST', 'users', {'name': 'Lock Test', 'email': 'locktest@apex.com', 'password': 'right1234', 'role': 'site_engineer'}, AD)
codes = [call('POST', 'auth/login', {'email': 'locktest@apex.com', 'password': f'wrong{i}'})[0] for i in range(5)]
s, d = call('POST', 'auth/login', {'email': 'locktest@apex.com', 'password': 'right1234'})
check('B25 after 5 wrong passwords the account is locked, even for the right password', codes == [401] * 5 and s == 429, (codes, s, d))
check('B25 other accounts are not affected', call('POST', 'auth/login', {'email': 'pm@apex.com', 'password': '123456'})[0] == 200)

# ---------------- B26  dates must make sense
call('POST', 'tasks', {'title': 'Lobby glazing', 'projectId': 'P002', 'assignedTo': 'U003', 'priority': 'Low', 'status': 'Pending', 'progress': 0, 'startDate': TODAY.isoformat(), 'deadline': (TODAY + datetime.timedelta(days=20)).isoformat(), 'description': 'Glazing', 'milestoneId': 'MS004'}, PM)
s, d = call('POST', 'expenses', {'projectId': 'P002', 'milestoneId': 'MS004', 'category': 'Transport', 'amount': 200, 'date': '2019-01-01', 'description': 'Very old taxi bill'}, SE)
check('B26 an expense dated before the project started is refused', s == 400 and 'before the project started' in str(d), (s, d))
check('B26 a payment dated before its bill is refused', call('POST', 'bills/B002/payments', {'amount': 1000, 'method': 'Bank transfer', 'reference': 'NEFT-OLD', 'paidAt': '2001-01-01'}, FM)[0] == 400)
check('B26 a task long after the project end is refused', call('POST', 'tasks', {'title': 'Far future', 'projectId': 'P001', 'assignedTo': 'U003', 'priority': 'Low', 'status': 'Pending', 'progress': 0, 'startDate': '2035-01-01', 'deadline': '2035-02-01', 'description': 'x', 'milestoneId': 'MS002'}, PM)[0] == 400)

# ---------------- B27  a company with projects cannot be deleted
s, d = call('DELETE', 'companies/COMP002', token=SU)
check('B27 deleting a company that still has projects is refused', s == 409, (s, d))
check('B27 its bills and staff are untouched', any(b['companyId'] == 'COMP002' for b in call('GET', 'bills', token=SU)[1]) and call('POST', 'auth/login', {'email': 'pm@ltinfra.com', 'password': '123456'})[0] == 200)

# ---------------- B28  material reported as used must have been issued, on every project
s, nm = call('POST', 'projects', {'name': 'REG plain project', 'companyId': 'COMP001', 'location': 'Pune', 'clientId': 'U005', 'clientName': 'Vikram Patel', 'managerId': 'U002', 'financeManagerId': 'U004', 'budget': 500000, 'progress': 0, 'status': 'On Track', 'startDate': TODAY.isoformat(), 'endDate': (TODAY + datetime.timedelta(days=60)).isoformat(), 'teamSize': 2, 'allocations': {'Other': 500000}, 'description': 'No milestones'}, SU)
call('POST', 'tasks', {'title': 'Painting', 'projectId': nm['id'], 'assignedTo': 'U003', 'priority': 'Low', 'status': 'Pending', 'progress': 0, 'startDate': TODAY.isoformat(), 'deadline': (TODAY + datetime.timedelta(days=10)).isoformat(), 'description': 'Paint walls'}, PM)
r = {'title': 'Daily log', 'projectId': nm['id'], 'date': TODAY.isoformat(), 'progress': 10, 'status': 'In Progress', 'workDone': 'Primer coat', 'priority': 'Low', 'photos': 0, 'submittedBy': 'U003'}
s, d = call('POST', 'reports', {**r, 'materials': [{'name': 'Paint', 'qty': 20, 'unit': 'litre'}]}, SE)
check('B28 a project without milestones also refuses material that was never issued', s == 400 and 'not issued' in str(d), (s, d))
check('B28 a report without materials is fine', call('POST', 'reports', {**r, 'materials': []}, SE)[0] == 201)

# ---------------- B29  the client is told about a new bill by the server (no screen has to remember it)
before = len([n for n in call('GET', 'notifications', token=C1)[1] if n.get('title') == 'New Bill Pending'])
s, bill = call('POST', 'bills', {'projectId': nm['id'], 'milestone': 'Painting advance', 'amount': 25000, 'description': 'First painting bill', 'dueDate': (TODAY + datetime.timedelta(days=10)).isoformat()}, FM)
after = [n for n in call('GET', 'notifications', token=C1)[1] if n.get('title') == 'New Bill Pending']
check('B29 raising a bill notifies the client once', s == 201 and len(after) == before + 1 and '25,000' in after[0].get('body', '') + after[-1].get('body', ''), (s, bill, after[-1:] if after else None))

# ---------------- B30  every screen gets the same "Delayed" status for a project with an overdue milestone
rows = call('GET', 'projects', token=PM)[1]
def expected(p):
    late = prog_late(p['id'])
    return 'Delayed' if late > 0 and p['status'] in ('On Track', 'In Progress') else p['status'], late
prog_late = lambda pid: call('GET', f'milestones/progress/{pid}', token=PM)[1].get('delayedMilestones', 0)
bad = [(p['id'], p.get('displayStatus'), p.get('delayedMilestones'), expected(p)) for p in rows if (p.get('displayStatus'), p.get('delayedMilestones')) != expected(p)]
check('B30 every project carries the same display status and overdue count as its milestone plan', not bad and any(p.get('displayStatus') == 'Delayed' for p in rows), bad or [(p['id'], p.get('displayStatus')) for p in rows])
s, cp = call('GET', 'projects/P002', token=C3)
check('B30 the client sees the same status as the PM', s == 200 and cp.get('displayStatus') == [p for p in rows if p['id'] == 'P002'][0].get('displayStatus'), cp.get('displayStatus'))
check('B30 a project without overdue milestones keeps its own status', call('GET', f"projects/{nm['id']}", token=PM)[1].get('displayStatus') == 'On Track')

print('ALL PASS' if ok else 'SOME FAILED')
sys.exit(0 if ok else 1)
