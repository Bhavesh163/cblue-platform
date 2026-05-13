import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

new_buttons = """            <button 
              onClick={() => {
                setWaitModalOrder(null);
              }} 
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition mt-4"
            >
              Cancel
            </button>
            <button
              className="mt-4 px-6 py-3 w-full bg-orange-100 border border-orange-300 text-orange-800 font-bold rounded-xl shadow-sm hover:bg-orange-200 transition"
              onClick={() => {
                setWaitModalOrder(null);
                window.location.href = `${prefix}/booking/resume/mock_job`; 
              }}
            >
              🚧 Testing Period Payment Pill 🚧
            </button>"""

# Find the exact button
import textwrap

old_button_start = text.find('onClick={() => {\\n                setWaitModalOrder(null);\\n                window.location.href = `${prefix}/partner-zone`;')

if old_button_start == -1:
    old_button_start = text.find('window.location.href = `${prefix}/partner-zone`;')

if old_button_start != -1:
    # Do string replace using simple splitting
    # The last button is Go to Our Customer Page
    target_block = """            <button 
              onClick={() => {
                setWaitModalOrder(null);
                window.location.href = `${prefix}/partner-zone`; 
              }} 
              className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
            >
              Go to Our Customer Page
            </button>"""
            
    if target_block in text:
        text = text.replace(target_block, new_buttons)
        print("Replaced!")
    else:
        print("Target block not found, trying partial")
else:
    print("Cannot find partner zone link")

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
