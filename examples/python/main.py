"""Ask an engineering document a question and get the page it came from.

Standard library only — Python 3.9 or newer.

    export VOHO_API_KEY=voho_sk_live_...   # app.voho.ai -> API Tokens
    python examples/python/main.py

New accounts start with $25 of credit, so this costs nothing to try.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

KEY = os.environ.get("VOHO_API_KEY")
BASE = os.environ.get("VOHO_BASE_URL", "https://app.voho.ai")

if not KEY:
    sys.exit("Set VOHO_API_KEY first — create one at https://app.voho.ai/tokens")


def voho(path, body, raw=False):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as res:
            return res.read() if raw else json.load(res)
    except urllib.error.HTTPError as err:
        detail = json.loads(err.read() or b"{}").get("error", {})
        sys.exit("%s: %s" % (detail.get("code", err.code), detail.get("message", "request failed")))


def spent(cents):
    print("\nCharged $%.2f from your Voho balance." % (cents / 100))

args = sys.argv[1:]
if len(args) >= 2:
    path, question = args[0], args[1]
elif len(args) == 1:
    path, question = None, args[0]
else:
    path, question = None, "What torque do the seal gland bolts take, and which revision is this?"

sample = BASE + "/samples/sample-manual.pdf"
if path:
    with open(path, "rb") as fh:
        data = base64.b64encode(fh.read()).decode()
else:
    print("No document given — asking the sample manual at", sample)
    with urllib.request.urlopen(sample) as res:
        data = base64.b64encode(res.read()).decode()

print("\nQ:", question)
out = voho("/v1/documents/ask", {"file": data, "mime_type": "application/pdf", "question": question})
print("A:", out["answer"])
if not out["answered"]:
    print("   (not in the document — it said so rather than guessing)")
for q in out["quotes"]:
    print("   >", q)
spent(out["cost_cents"])
