const fs = require('fs');

function removeFirstLoginPill(file) {
  let code = fs.readFileSync(file, 'utf8');
  // Look for the header login button logic:
  // ) : !loading ? (
  //   <Link href={`${prefix}/subscription/login`} ...
  //     {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
  //   </Link>
  // ) : null}
  code = code.replace(/\) : !loading \? \([\s\S]*?\) : null\}/, ') : null}');
  fs.writeFileSync(file, code);
}

removeFirstLoginPill('apps/web/app/[locale]/dashboard/page.tsx');
removeFirstLoginPill('apps/web/app/[locale]/fixers/page.tsx');
