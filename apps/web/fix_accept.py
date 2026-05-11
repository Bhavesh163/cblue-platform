import re
with open("app/[locale]/fixers/page.tsx", "r") as f:
    text = f.read()

# Replace the alert with API call
text = re.sub(
    r"onClick=\{\(\) => \{ setWaitModalOrder\(null\); window\.alert\('PO Accepted! Notification sent to customer\.'\); \}\}",
    r"""onClick={async () => {
                  try {
                    const token = localStorage.getItem("subscriber_token");
                    await fetch(`http://localhost:3002/api/orders/${waitModalOrder.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({ status: "PENDING" })
                    });
                    window.location.reload();
                  } catch (e) {
                    console.error(e);
                  }
                }}""",
    text
)
with open("app/[locale]/fixers/page.tsx", "w") as f:
    f.write(text)
