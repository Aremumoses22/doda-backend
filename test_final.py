import urllib.request, json, time

BASE = "http://localhost:8080"

def req(method, path, data=None, token=None):
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    r = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

_, r = req("POST", "/api/auth/login", {"email": "dodalegalpractitioners@gmail.com", "password": "ChangeMe123!"})
token = r["accessToken"]
print("LOGIN: OK")

# Client - no clientCode passed (auto-generate)
s, r = req("POST", "/api/clients", {"companyName": "Lagos Fintech Ltd", "primaryEmail": "cfo@lagosfintech.com", "clientType": "startup_growth", "engagementType": "advisory"}, token)
print(f"CREATE CLIENT: {s} -> code={r.get('clientCode')} id={r.get('_id', 'ERR:'+str(r)[:60])}")
cid = r.get("_id")

# Retainer
if cid:
    s, r = req("POST", "/api/retainers", {"clientId": cid, "planName": "Startup Retainer", "monthlyFee": 150000, "currency": "NGN", "startDate": "2026-05-01T00:00:00.000Z", "renewalDate": "2027-05-01T00:00:00.000Z", "status": "active"}, token)
    print(f"CREATE RETAINER: {s} -> id={r.get('_id', 'ERR:'+str(r)[:60])}")

# Matter - no matterCode passed
if cid:
    s, r = req("POST", "/api/matters", {"title": "Shareholders Agreement", "clientId": cid, "practiceArea": "contracts", "status": "active"}, token)
    print(f"CREATE MATTER: {s} -> code={r.get('matterCode')} id={r.get('_id', 'ERR:'+str(r)[:60])}")
    mid = r.get("_id")

# Invoice - no invoiceNumber passed
if cid:
    s, r = req("POST", "/api/invoices", {"clientId": cid, "description": "Legal services", "lineItems": [{"description": "Advisory", "quantity": 1, "unitPrice": 200000, "total": 200000}], "subtotal": 200000, "vatRate": 7.5, "vatAmount": 15000, "total": 215000, "currency": "NGN"}, token)
    print(f"CREATE INVOICE: {s} -> number={r.get('invoiceNumber')} id={r.get('_id', 'ERR:'+str(r)[:60])}")

# Team member - unique email with timestamp
email = f"chidinma.{int(time.time())}@doda.ng"
s, r = req("POST", "/api/team", {"firstName": "Chidinma", "lastName": "Ezeh", "email": email, "role": "associate", "password": "Lawyer2026!"}, token)
print(f"CREATE TEAM: {s} -> id={r.get('_id', 'ERR:'+str(r)[:60])}")

print("\nDONE")
