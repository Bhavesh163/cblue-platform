import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the injected block
    start_idx = content.find('  // Poll order status to auto-advance')
    if start_idx != -1:
        end_idx = content.find('  const t = (key: string) =>')
        block = content[start_idx:end_idx]
        
        # Remove the block from its current bad position
        content = content[:start_idx] + content[end_idx:]
        
        # Now place it inside the component right AFTER the state declarations
        # We can find `const [poNumber, setPoNumber]`
        place_idx = content.find('const [poNumber, setPoNumber]')
        place_end = content.find('\n', place_idx) + 1
        
        new_content = content[:place_end] + "\n" + block + "\n" + content[place_end:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Fixed polling placement")

fix_file('app/[locale]/components/FixerResults.tsx')
