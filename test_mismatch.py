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

# 1. Client individual type (form sends individualName)
s, r = req("POST", "/api/clients", {"clientType":"individual","primaryEmail":"ada.test@example.com","individualName":"Ada Okonkwo","engagementType":"advisory"}, t)
print(f"CLIENT individual: {s} -> {r.get('_id','ERR:'+str(r)[:100])}")
cid = r.get("_id","")

# 2. Matter with 'corporate' practiceArea (frontend value)
s2, r2 = req("POST", "/api/matters", {"clientId":cid,"title":"Test Matter","practiceArea":"corporate","priority":"medium"}, t)
print(f"MATTER corporate: {s2} -> {r2.get('_id','ERR:'+str(r2)[:100])}")

# 3. Invoice with 'rate' field (frontend sends rate, not unitPrice)
s3, r3 = req("POST", "/api/invoices", {
    "clientId": cid,
    "lineItems": [{"description":"Legal fee","quantity":1,"rate":100000}],
    "taxRate": 7.5,
    "subtotal": 100000,
    "total": 107500
}, t)
print(f"INVOICE with rate: {s3} -> {r3.get('_id','ERR:'+str(r3)[:100])}")
