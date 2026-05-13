import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

pill = """              <button
                className="mt-4 px-6 py-3 w-full bg-orange-100 border border-orange-300 text-orange-800 font-bold rounded-xl shadow-sm hover:bg-orange-200 transition"
                   onClick={() => {
                     setWaitModalOrder(null);
                     window.location.href = `${prefix}/booking/resume/mock_job`;
                   }}
              >
                🚧 Testing Period Payment Pill 🚧
              </button>
"""

# Let's see if there is already a cancel block
if "🚧 Testing Period Payment" not in text:
    text = text.replace('              </div>', '              </div>\n' + pill, 1) # add after the gray-50 block ? Wait.
    
with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
