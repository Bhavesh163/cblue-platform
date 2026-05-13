#!/bin/bash
python3 << 'PYTHON_EOF'
import re

file_path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/dashboard/page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for Progress12Steps
new_progress = '''    const Progress12Steps = ({ currentStep }: { currentStep: number }) => (
    <div className="w-full mt-4 overflow-x-auto pb-4 hide-scrollbar">
      <div className="flex items-center min-w-max relative px-2">
        <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-1 bg-gray-200 rounded-full"></div>
        <div className="absolute left-4 top-3 -translate-y-1/2 h-1 bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100))}%` }}></div>
        
        {STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={s} className="relative z-10 flex flex-col items-center flex-1 px-1">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isCompleted ? 'bg-sky-500 text-white' : isCurrent ? 'bg-sky-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,0.2)]' : 'bg-gray-300'}`}>
                {isCompleted ? '✓' : ''}
              </div>
              <span className={`text-[10px] mt-2 whitespace-nowrap ${isCurrent ? 'text-sky-600 font-bold' : isCompleted ? 'text-sky-500' : 'text-gray-400'}`}>
                {s}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );'''

# Need to replace the old function completely
# Let's find the start and end of the function
start_str = "    const Progress12Steps = ({ currentStep }: { currentStep: number }) => ("
end_str = "  );"

start_idx = content.find(start_str)
if start_idx != -1:
    end_idx = content.find("  );", start_idx) + 4
    # ensure we got the right end by replacing
    content = content[:start_idx] + new_progress + content[end_idx:]
    print("✅ Replaced Progress12Steps")
else:
    print("⚠️ Progress12Steps not found")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
PYTHON_EOF
