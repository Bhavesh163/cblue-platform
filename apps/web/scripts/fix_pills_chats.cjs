const fs = require('fs');

function fixDashboard() {
  let code = fs.readFileSync('apps/web/app/[locale]/dashboard/page.tsx', 'utf8');

  // Remove forced redirect
  code = code.replace(/if \(user\.fixer && isMounted\) \{\n\s*router\.push\(\`\$\{prefix\}\/fixers\`\);\n\s*return;\n\s*\}/, '');
  
  // Fix logout
  code = code.replace(/\} else \{\n\s*localStorage\.removeItem\("subscriber_token"\);\n\s*localStorage\.removeItem\("subscriber"\);\n\s*\}/g, 
    `} else if (res.status === 401 || res.status === 403) {\n          localStorage.removeItem("subscriber_token");\n          localStorage.removeItem("subscriber");\n        }`);

  // Map properties array
  code = code.replace(/const requests = activeOrders.filter\(o => \['CREATED', 'MATCHING', 'PENDING'\]\.includes\(o\.status\)\);/, 
    `const requests = activeOrders.filter(o => ['CREATED', 'MATCHING', 'PENDING'].includes(o.status));\n  const properties = mappedOrders.filter(o => o.type === 'property');`);

  // Update tabs array
  code = code.replace(/badge: 0/g, 'badge: undefined');
  code = code.replace(/\{ key: "property", label: locale === "th" \? "อสังหาริมทรัพย์" : locale === "zh" \? "房产" : "Properties", icon: "🏢", badge: undefined \}/, 
    '{ key: "property", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Properties", icon: "🏢", badge: properties.length > 0 ? properties.length : undefined }');

  // Pass properties prop
  code = code.replace(/\{activeTab === "property" && <PropertyTab locale=\{locale\} prefix=\{prefix\} \/>\}/, '{activeTab === "property" && <PropertyTab locale={locale} prefix={prefix} properties={properties} />}');

  // Update PropertyTab
  code = code.replace(/function PropertyTab\(\{ locale, prefix \}: \{ locale: string; prefix: string \}\) \{[\s\S]*?\}\s*\}/, `function PropertyTab({ locale, prefix, properties }: { locale: string; prefix: string; properties: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🏢 {locale === "th" ? "การนัดหมายดูอสังหาริมทรัพย์" : locale === "zh" ? "房产查询" : "Property Inquiries"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {properties && properties.length > 0 ? properties.map((p: any) => (
          <div key={p.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-2xl">🏢</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? p.serviceTh : locale === "zh" ? p.serviceZh : p.service} <span className="text-gray-400 font-normal">· {p.partner}</span></h3>
                    <p className="text-sm text-gray-500 mt-1">{p.fee}</p>
                  </div>
                  <span className={\`text-xs px-3 py-1 rounded-full font-bold \${STATUS_STYLE[p.status] || ""}\`}>{getStatusLabel(p.status, locale)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Link href={\`\${prefix}/chat/\${p.id}\`} className="flex-1 text-center py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition">
                {locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat"}
              </Link>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีรายการอสังหาริมทรัพย์" : locale === "zh" ? "没有房产查询" : "No property inquiries"}</p>
        )}
      </div>
    </div>
  );
}`);

  // Update Chats
  code = code.replace(/\{DEMO_CHATS\.map\(\(c\) => \([\s\S]*?\}\)\)\}/g, `
        {chats && chats.length > 0 ? chats.map((c: any) => (
          <div key={c.id} className={\`flex items-center gap-4 px-6 py-4 cursor-pointer transition \${c.unread > 0 ? "bg-sky-50/50 hover:bg-sky-50" : "hover:bg-gray-50"}\`}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{c.name.slice(-4)}</div>
              {c.online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <p className="font-bold text-gray-900 truncate">{c.name} <span className="text-gray-400 font-normal">· {c.service}</span></p>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{locale === "th" ? c.timeTh : locale === "zh" ? c.timeZh : c.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className={\`text-sm truncate \${c.unread > 0 ? "font-semibold text-gray-900" : "text-gray-500"}\`}>
                  {locale === "th" ? c.lastMsgTh : locale === "zh" ? c.lastMsgZh : c.lastMsg}
                </p>
                {c.unread > 0 && <span className="flex-shrink-0 ml-2 w-5 h-5 bg-sky-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{c.unread}</span>}
              </div>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "没有最近的聊天" : "No recent chats"}</p>
        )}
`);

  // Update Notifications
  code = code.replace(/\{DEMO_NOTIFICATIONS\.map\(\(n\) => \([\s\S]*?\}\)\)\}/g, `
        {notifications && notifications.length > 0 ? notifications.map((n: any) => (
          <div key={n.id} className={\`flex items-center gap-4 px-6 py-4 transition \${n.unread ? "bg-sky-50/50" : "hover:bg-gray-50"}\`}>
            <span className={\`w-3 h-3 rounded-full \${n.dot} flex-shrink-0\`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2.5 h-2.5 bg-sky-500 rounded-full" />}
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีการแจ้งเตือน" : locale === "zh" ? "没有通知" : "No recent alerts"}</p>
        )}
`);

  // Remove hardcoded elements
  code = code.replace(/\{\/\* Meeting Reminders \*\/\}\n\s*\{subscriber && \([\s\S]*?\}\)/, '');
  code = code.replace(/\{\/\* Rating Reminders \*\/\}\n\s*\{subscriber && \([\s\S]*?\}\)/, '');
  code = code.replace(/const DEMO_CHATS: any\[\] = \[\];/, 'const chats: any[] = [];');
  code = code.replace(/const DEMO_NOTIFICATIONS: any\[\] = \[\];/, '');
  code = code.replace(/const DEMO_PROPERTY_INQUIRIES: any\[\] = \[\];/, '');

  fs.writeFileSync('apps/web/app/[locale]/dashboard/page.tsx', code);
}

function fixPartner() {
  let code = fs.readFileSync('apps/web/app/[locale]/fixers/page.tsx', 'utf8');

  // Fix logout
  code = code.replace(/\} else \{\n\s*localStorage\.removeItem\("subscriber_token"\);\n\s*localStorage\.removeItem\("subscriber"\);\n\s*\}/g, 
    `} else if (res.status === 401 || res.status === 403) {\n          localStorage.removeItem("subscriber_token");\n          localStorage.removeItem("subscriber");\n        }`);

  // Calculate real stats
  const statsReplacement = `
  const activeJobs = mappedOrders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const completedJobs = mappedOrders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status));
  const incomingJobs = mappedOrders.filter(o => o.status === 'CREATED' || o.status === 'MATCHING');
  const properties = mappedOrders.filter(o => o.type === 'property');

  const stats = {
    activeJobs: activeJobs.length,
    completedJobs: completedJobs.length,
    monthlyEarnings: "฿" + completedJobs.reduce((acc, j) => acc + (parseInt(j.fee.replace(/\\D/g, '')) || 0), 0).toLocaleString(),
    rating: 4.8,
    responseRate: "96%",
    repeatClients: 0,
  };
`;
  code = code.replace(/const mappedOrders = orders\.map\(o => \(\{[\s\S]*?\}\)\);\n\n\s*const activeJobs = mappedOrders\.filter\(o => !\['COMPLETED', 'CANCELLED'\]\.includes\(o\.status\)\);\n\s*const completedJobs = mappedOrders\.filter\(o => \['COMPLETED', 'CANCELLED'\]\.includes\(o\.status\)\);\n\s*const incomingJobs = mappedOrders\.filter\(o => o\.status === 'CREATED' || o\.status === 'MATCHING'\);/, 
  "const mappedOrders = orders.map(o => ({\n    id: o.id,\n    customer: o.user?.name || \"Customer\",\n    phone: o.user?.phone || \"\",\n    type: o.orderType?.toLowerCase() || \"household\",\n    service: (o.serviceCategory || \"\").replace(/_/g, \" \"),\n    serviceTh: (o.serviceCategory || \"\").replace(/_/g, \" \"),\n    serviceZh: (o.serviceCategory || \"\").replace(/_/g, \" \"),\n    date: new Date(o.createdAt).toLocaleDateString(),\n    status: o.status,\n    tier: \"Standard\",\n    earnings: o.estimatedPrice ? `฿${o.estimatedPrice}` : \"TBD\",\n    fee: o.estimatedPrice ? `฿${o.estimatedPrice}` : \"TBD\"\n  }));\n" + statsReplacement);
  code = code.replace(/stats=\{\{activeJobs: 0, completedJobs: 0, monthlyEarnings: "฿0", rating: 0, responseRate: "0%", repeatClients: 0\}\}/, "stats={stats}");

  // Update Registration cards wrapper
  const newCards = `
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Register as Fixer & Pro */}
          {(!isSubscribed || !isFixer) && !loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-sky-500 to-blue-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4 text-xl">🔧</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "สมัครเป็นช่างและมืออาชีพ CBLUE" : locale === "zh" ? "注册成为CBLUE技工和专业人士" : "Register as CBLUE Fixer & Pro"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "เข้าร่วมเครือข่ายช่างมืออาชีพ รับงานทั่วประเทศ" : locale === "zh" ? "加入专业网络，全国接单" : "Join our professional network. Receive jobs nationwide."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "รับงานทั่วประเทศ" : locale === "zh" ? "全国接单" : "Receive jobs nationwide",
                  locale === "th" ? "KYC ยืนยันตัวตน" : locale === "zh" ? "KYC身份验证" : "KYC identity verification",
                  locale === "th" ? "5 ระดับ Economy / Standard / Corporate / Specialist / Expert" : locale === "zh" ? "5个等级：基础到专家" : "5 tiers: Economy to Expert",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={\`\${prefix}/fixers/register\`} className="block text-center py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "สมัครเป็นช่าง" : locale === "zh" ? "注册成为技工" : "Register as Fixer"}
              </Link>
            </div>
          </div>
          )}

          {/* List Property */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4 text-xl">🏢</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "ลงประกาศอสังหาริมทรัพย์" : locale === "zh" ? "发布新房产" : "List New Property"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "ลงประกาศขายหรือเช่าคอนโด บ้าน ทาวน์เฮาส์ ที่ดิน" : locale === "zh" ? "发布公寓、别墅、联排别墅或土地出售或出租" : "List condo, house, townhouse, or land for sale or rent."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "เข้าถึงผู้ซื้อและผู้เช่าทั่วไทย" : locale === "zh" ? "触达全国买家和租客" : "Reach buyers & renters nationwide",
                  locale === "th" ? "อัปโหลดรูปภาพและรายละเอียด" : locale === "zh" ? "上传照片和详情" : "Upload photos & details",
                  locale === "th" ? "จัดการประกาศจากแดชบอร์ด" : locale === "zh" ? "从仪表板管理列表" : "Manage listings from dashboard",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={\`\${prefix}/properties/register\`} className="block text-center py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "ลงประกาศ" : locale === "zh" ? "发布房产" : "List Property"}
              </Link>
            </div>
          </div>
        </div>
`;
  code = code.replace(/\{\/\* Registration Cards \*\/\}\n\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">[\s\S]*?\{\/\* Price List Table \*\/\}/, '{/* Registration Cards */}\n' + newCards.trim() + '\n\n        {/* Price List Table */}');

  // Properties tab mapping
  code = code.replace(/badge: 0/g, 'badge: undefined');
  code = code.replace(/\{ key: "properties", label: locale === "th" \? "อสังหาริมทรัพย์" : locale === "zh" \? "房产" : "Properties", icon: "🏢", badge: undefined \}/,
  '{ key: "properties", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Properties", icon: "🏢", badge: properties.length > 0 ? properties.length : undefined }');
  code = code.replace(/\{activeTab === "properties" && <PartnerProperties locale=\{locale\} prefix=\{prefix\} \/>\}/, '{activeTab === "properties" && <PartnerProperties locale={locale} prefix={prefix} properties={properties} />}');

  code = code.replace(/function PartnerProperties\(\{ locale, prefix \}: \{ locale: string; prefix: string \}\) \{[\s\S]*?\}\s*\}/, `function PartnerProperties({ locale, prefix, properties }: { locale: string; prefix: string; properties: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🏢 {locale === "th" ? "อสังหาริมทรัพย์ของคุณ" : locale === "zh" ? "您的房产" : "Your Properties"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {properties && properties.length > 0 ? properties.map((p: any) => (
          <div key={p.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-teal-100 flex items-center justify-center text-3xl">🏢</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? p.serviceTh : locale === "zh" ? p.serviceZh : p.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{p.fee}</p>
                  </div>
                  <span className={\`text-xs px-3 py-1 rounded-full font-bold \${p.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}\`}>
                    {getStatusLabel(p.status, locale)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
              <Link href={\`\${prefix}/properties/\${p.id}/edit\`} className="ml-auto px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition">
                {locale === "th" ? "แก้ไข" : locale === "zh" ? "编辑" : "Edit"}
              </Link>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีประกาศอสังหาริมทรัพย์" : locale === "zh" ? "没有房产列表" : "No properties listed"}</p>
        )}
      </div>
    </div>
  );
}`);

  // Chats
  code = code.replace(/\{DEMO_CHATS\.map\(\(c\) => \([\s\S]*?\}\)\)\}/g, `
            {chats && chats.length > 0 ? chats.map((c: any) => (
              <div key={c.id} className={\`flex items-center gap-3 p-3 rounded-lg \${c.unread > 0 ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}\`}>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{c.name.slice(-3)}</div>
                  {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.name} <span className="text-gray-400 font-normal">· {c.service}</span></p>
                  <p className="text-xs text-gray-500 truncate">{locale === "th" ? c.lastMsgTh : locale === "zh" ? c.lastMsgZh : c.lastMsg}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">{locale === "th" ? c.timeTh : locale === "zh" ? c.timeZh : c.time}</span>
                  {c.unread > 0 && <span className="block mt-0.5 ml-auto w-5 h-5 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{c.unread}</span>}
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 py-4 text-center">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "没有最近的聊天" : "No recent chats"}</p>
            )}
`);

  // Notifications
  code = code.replace(/\{notifications\.map\(\(n\) => \([\s\S]*?\}\)\)\}/g, `
        {notifications && notifications.length > 0 ? notifications.map((n: any) => (
          <div key={n.id} className={\`flex items-center gap-4 px-6 py-4 transition \${n.unread ? "bg-purple-50/50" : "hover:bg-gray-50"}\`}>
            <span className={\`w-3 h-3 rounded-full \${n.dot} flex-shrink-0\`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2 h-2 bg-purple-500 rounded-full" />}
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีการแจ้งเตือน" : locale === "zh" ? "没有通知" : "No recent alerts"}</p>
        )}
`);

  code = code.replace(/\{notifications\.slice\(0, 3\)\.map\(\(n\) => \([\s\S]*?\}\)\)\}/g, `
            {notifications && notifications.length > 0 ? notifications.slice(0, 3).map((n: any) => (
              <div key={n.id} className={\`flex items-center gap-3 p-3 rounded-lg \${n.unread ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}\`}>
                <span className={\`w-2 h-2 rounded-full \${n.dot} flex-shrink-0\`} />
                <p className="text-sm text-gray-700 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
              </div>
            )) : (
              <p className="text-sm text-gray-500 py-2 text-center">{locale === "th" ? "ไม่มีการแจ้งเตือน" : locale === "zh" ? "没有通知" : "No recent alerts"}</p>
            )}
`);

  // Remove hardcoded
  code = code.replace(/const DEMO_CHATS: any\[\] = \[\];/, 'const chats: any[] = [];');
  code = code.replace(/const DEMO_PROPERTY_LISTINGS: any\[\] = \[\];/, '');

  fs.writeFileSync('apps/web/app/[locale]/fixers/page.tsx', code);
}

fixDashboard();
fixPartner();

