import urllib.request, json, sys

BASE = "http://localhost:8080"

def post(path, data, token=None):
    body = json.dumps(data).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def patch(path, data, token):
    body = json.dumps(data).encode()
    headers = {"Content-Type": "application/json", "Authorization": "Bearer " + token}
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def get(path, token):
    headers = {"Authorization": "Bearer " + token}
    req = urllib.request.Request(BASE + path, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def ok(label, r, key="_id"):
    if key in r:
        print(f"  ✅ {label}: {r[key]}")
        return r[key]
    else:
        print(f"  ❌ {label}: {r}")
        return None

def ok_list(label, r):
    if isinstance(r, list):
        print(f"  ✅ {label}: count={len(r)}")
    else:
        print(f"  ❌ {label}: {r}")

# ── LOGIN ──────────────────────────────────────────────────────────────────────
print("\n=== AUTH ===")
r = post("/api/auth/login", {"email": "dodalegalpractitioners@gmail.com", "password": "ChangeMe123!"})
token = r.get("accessToken", "")
print(f"  {'✅ Login OK' if token else '❌ Login FAIL: '+str(r)}")
if not token:
    sys.exit(1)

# ── LEADS ──────────────────────────────────────────────────────────────────────
print("\n=== LEADS ===")
r = post("/api/leads", {
    "fullName": "Tunde Adeola",
    "email": "tunde@startupng.com",
    "phone": "08012345678",
    "companyName": "StartupNG",
    "businessType": "startup",
    "description": "Need help with company incorporation and shareholders agreement",
    "serviceInterest": ["corporate_law"],
    "engagementType": "transactional"
})
lead_id = ok("Create Lead (public)", r)

ok_list("List Leads", get("/api/leads", token))

if lead_id:
    r = patch(f"/api/leads/{lead_id}", {"status": "contacted", "internalNotes": "Called, very interested"}, token)
    ok("Update Lead", r)

# ── CLIENTS ────────────────────────────────────────────────────────────────────
print("\n=== CLIENTS ===")
r = post("/api/clients", {
    "clientCode": "CLT-2026-001",
    "companyName": "Acme Nigeria Ltd",
    "primaryEmail": "ceo@acmenigeria.com",
    "primaryPhone": "08098765432",
    "clientType": "sme",
    "industry": "Technology",
    "engagementType": "advisory",
    "status": "active"
}, token)
client_id = ok("Create Client", r)

ok_list("List Clients", get("/api/clients", token))

if client_id:
    r = patch(f"/api/clients/{client_id}", {"status": "active", "address": "5 Admiralty Way, Lekki"}, token)
    ok("Update Client", r)

# ── MATTERS ────────────────────────────────────────────────────────────────────
print("\n=== MATTERS ===")
matter_id = None
if client_id:
    r = post("/api/matters", {
        "matterCode": "MAT-2026-001",
        "title": "Company Incorporation — Acme Nigeria",
        "clientId": client_id,
        "practiceArea": "corporate_law",
        "status": "active",
        "priority": "high",
        "description": "Full incorporation including CAC registration"
    }, token)
    matter_id = ok("Create Matter", r)

ok_list("List Matters", get("/api/matters", token))

if matter_id:
    r = patch(f"/api/matters/{matter_id}", {"status": "under_review"}, token)
    ok("Update Matter", r)

    r = post(f"/api/matters/{matter_id}/tasks", {
        "title": "Prepare Memorandum & Articles",
        "description": "Draft MEMART document",
        "status": "not_started"
    }, token)
    ok("Create Matter Task", r)

    ok_list("List Matter Tasks", get(f"/api/matters/{matter_id}/tasks", token))

# ── INVOICES ───────────────────────────────────────────────────────────────────
print("\n=== INVOICES ===")
invoice_id = None
if client_id:
    r = post("/api/invoices", {
        "invoiceNumber": "INV-2026-001",
        "clientId": client_id,
        "matterId": matter_id,
        "description": "Company incorporation services",
        "lineItems": [
            {"description": "CAC Registration Fee", "quantity": 1, "unitPrice": 150000, "total": 150000},
            {"description": "Legal Advisory", "quantity": 3, "unitPrice": 50000, "total": 150000}
        ],
        "subtotal": 300000,
        "vatRate": 7.5,
        "vatAmount": 22500,
        "total": 322500,
        "currency": "NGN",
        "status": "draft",
        "dueDate": "2026-05-30T00:00:00.000Z"
    }, token)
    invoice_id = ok("Create Invoice", r)

ok_list("List Invoices", get("/api/invoices", token))

if invoice_id:
    r = patch(f"/api/invoices/{invoice_id}", {"status": "sent", "issuedDate": "2026-04-23T00:00:00.000Z"}, token)
    ok("Update Invoice (send)", r)

# ── RETAINERS ──────────────────────────────────────────────────────────────────
print("\n=== RETAINERS ===")
if client_id:
    r = post("/api/retainers", {
        "clientId": client_id,
        "planName": "Growth Advisory Retainer",
        "monthlyFee": 200000,
        "currency": "NGN",
        "startDate": "2026-05-01T00:00:00.000Z",
        "renewalDate": "2027-05-01T00:00:00.000Z",
        "status": "active",
        "autoRenew": True
    }, token)
    ret_id = ok("Create Retainer", r)
    ok_list("List Retainers", get("/api/retainers", token))

# ── MESSAGES ───────────────────────────────────────────────────────────────────
print("\n=== MESSAGES ===")
# Get the principal's user id first
me = get("/api/auth/me", token)
user_id = me.get("_id", "")
if client_id and user_id:
    r = post("/api/messages", {
        "clientId": client_id,
        "matterId": matter_id,
        "body": "Good morning, your incorporation documents are ready for review.",
        "isInternal": False
    }, token)
    ok("Create Message", r)

ok_list("List Messages", get("/api/messages", token))

# ── TEAM ───────────────────────────────────────────────────────────────────────
print("\n=== TEAM ===")
r = post("/api/team", {
    "firstName": "Amara",
    "lastName": "Okonkwo",
    "email": "amara.okonkwo@doda.ng",
    "role": "lawyer",
    "password": "Lawyer2026!",
    "title": "Associate Counsel",
    "specialisms": ["corporate_law", "contracts"]
}, token)
team_key = r.get("_id") or r.get("user", {}).get("_id")
print(f"  {'✅ Create Team Member: '+str(team_key) if team_key else '❌ Create Team: '+str(r)}")

ok_list("List Team", get("/api/team", token))

# ── NOTIFICATIONS ──────────────────────────────────────────────────────────────
print("\n=== NOTIFICATIONS ===")
ok_list("List Notifications", get("/api/notifications", token))

# ── REPORTS ────────────────────────────────────────────────────────────────────
print("\n=== REPORTS ===")
for rp in ["revenue", "matters", "leads", "clients"]:
    r = get(f"/api/reports/{rp}", token)
    print(f"  {'✅' if 'error' not in r else '❌'} Report/{rp}: {str(r)[:60]}")

print("\n=== DONE ===\n")
