with open('apps/web/app/[locale]/dashboard/page.tsx', 'r') as f:
    content = f.read()

target_str = '''          }</p>
        </div>
      </div>
    </div>
  );
}

/* ===== OVERVIEW TAB ===== */'''

replacement = '''          }</p>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===== OVERVIEW TAB ===== */'''

content = content.replace(target_str, replacement)

with open('apps/web/app/[locale]/dashboard/page.tsx', 'w') as f:
    f.write(content)
