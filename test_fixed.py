import urllib.request, json

BASE = "http://localhost:8080"
def req(m, p, d=None, t=None):
    b = json.dumps(d).encode() if d else None
    h = {"Content-Type":"application/json"}
    if t: h["Authorization"]="Bearer "+t
    r = urllib.request.Request(BASE+p, data=b, headers=h, method=m)
    try:
        with urllib.request.urlopen(r) as resp: return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read())

_, r = req("POST", "/api/auth/login", {"email":"dodalegalpractitioners@gmail.com","password":"ChangeMe123!"})
t = r["accessToken"]

# Test client with "corporate" (mapped from "company")
s, r = req("POST", "/api/clients", {"clientType":"corporate","primaryEmail":"testcorp@example.com","companyName":"Test Corp Ltd","engagementType":"advisory"}, t)
print(f"CLIENT corporate: {s} -> code={r.get('clientCode','ERR:'+str(r)[:80])}")
cid = r.get("_id","")

# Test matter with correct practiceArea enum values
for pa in ["corporate_law","contracts","compliance","startup_sme","ip","property","general_advisory"]:
    s2, r2 = req("POST", "/api/matters", {"clientId":cid,"title":f"Test {pa}","practiceArea":pa,"priority":"normal"}, t)
    print(f"MATTER {pa}: {s2} -> {r2.get('matterCode','ERR:'+str(r2)[:60])}")

# Test invoice with corrected payload (unitPrice, total per line, subtotal/vatAmount/total)
subtotal = 200000
tax = subtotal * 0.075
total = subtotal + tax
s3, r3 = req("POST", "/api/invoices", {
    "clientId": cid,
    "lineItems": [{"description":"Legal consultation","quantity":2,"unitPrice":100000,"total":200000}],
    "taxRate": 7.5,
    "subtotal": subtotal,
    "vatAmount": tax,
    "total": total,
}, t)
print(f"INVOICE correct: {s3} -> {r3.get('invoiceNumber','ERR:'+str(r3)[:80])}")
