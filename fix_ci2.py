import re

def fix_layout():
    path = "apps/web/app/[locale]/layout.tsx"
    with open(path, "r") as f:
        content = f.read()

    # Fix syntax error which is from `params: Promise<{ locale: string }>; / }`
    content = content.replace("Promise<{ locale: string }>; / }): Promise<Metadata> {", "Promise<{ locale: string }> }): Promise<Metadata> {")
    content = content.replace("params: Promise<{ locale: string }> }): Promise<Metadata> {", "params: { locale: string } }): Promise<Metadata> {")
    content = re.sub(r"params: \{ locale: string \} }\): Promise<Metadata> \{", "params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {", content)
    # the exact line was probably 
    # export async function generateMetadata({
    #  params,
    # }: {
    #  params: Promise<{ locale: string }>; / }): Promise<Metadata> {

    # Actually let's just make it simpler
    content = re.sub(r"params:\s*Promise<\{\s*locale:\s*string\s*\}>\s*;\s*/\s*}\)\s*:\s*Promise<Metadata>\s*\{", "params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {", content)
    
    with open(path, "w") as f:
        f.write(content)

def fix_register():
    path = "apps/web/app/[locale]/fixers/register/page.tsx"
    with open(path, "r") as f:
        content = f.read()
    
    # Fix syntax error near line 535
    content = content.replace("catch ( {", "catch (error) {")
    
    with open(path, "w") as f:
        f.write(content)

fix_layout()
fix_register()
