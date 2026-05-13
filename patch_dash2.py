with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

start = text.find('{activeTab === "active" && (')
end = text.find('{activeTab === "properties" && (')

if start != -1 and end != -1:
    old_block = text[start:end]
    print("Found block to replace!")
    
    new_block = """{activeTab === "requests" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Incoming Requests</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REQUESTS_MOCK.map(m => (
                <div key={m.title} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg uppercase mb-2">{m.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{m.desc}</p>
                    <div className="mb-4 bg-sky-50 rounded p-3 border border-sky-100">
                       <p className="text-xs text-sky-800 font-bold mb-1 pl-1">Payment Requested</p>
                       <p className="text-xl text-sky-900 font-bold pl-1 font-mono">฿1,500.00</p>
                    </div>
                  </div>
                  <button className="bg-sky-600 w-full text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-sky-700 transition" onClick={() => setWaitModalOrder({ id: 'mock', status: 'MATCHING', request: m })}>Pay Fee &rarr;</button>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === "active" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">Active Jobs</h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{ACTIVE_MOCK.length}</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACTIVE_MOCK.map(m => renderMockCard(m, false))}
          </div>
        </div>
      )}

      """
    
    text = text.replace(old_block, new_block)
    with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
        f.write(text)
    print("Replaced!")
else:
    print("Not found")

