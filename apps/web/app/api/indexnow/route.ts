import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // IndexNow API expects a key, urlList, and host
    const indexNowPayload = {
      host: "www.cblue.co.th",
      key: "cblue-indexnow-key",
      keyLocation: "https://www.cblue.co.th/cblue-indexnow-key.txt",
      urlList: body.urlList || ["https://www.cblue.co.th/"],
    };

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(indexNowPayload),
    });

    if (response.ok) {
      return NextResponse.json({ success: true, message: "IndexNow triggered successfully" });
    } else {
      return NextResponse.json({ success: false, error: response.statusText }, { status: response.status });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
