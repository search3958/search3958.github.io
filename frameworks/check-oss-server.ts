import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLACKLIST_UUIDS = ['00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff'];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 400エラー対策: JSONパースを安全に行う
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error("Invalid JSON body");
    }

    const { uuid, url, action } = body;
    if (!uuid) throw new Error("Missing UUID");

    // ヘッダー情報の抽出
    const cfIpcountry = req.headers.get("cf-ipcountry") || "Unknown";
    const xForwardedFor = req.headers.get("x-forwarded-for") || "Unknown";
    const cfConnectingIp = req.headers.get("cf-connecting-ip") || "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const referer = req.headers.get("referer") || "Unknown";

    let serverStatus = "normal";

    // UUIDの判定
    if (BLACKLIST_UUIDS.includes(uuid)) {
      serverStatus = "blocked";
    }

    // AdBlockエラーの報告だった場合
    if (action === "ad_error") {
      serverStatus = "ad_error";
    }

    // DBへの保存
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase
      .from("access_logs")
      .insert({
        uuid,
        url,
        cf_ipcountry: cfIpcountry,
        x_forwarded_for: xForwardedFor,
        cf_connecting_ip: cfConnectingIp,
        user_agent: userAgent,
        referer: referer,
        status: serverStatus
      });

    if (dbError) throw dbError;

    // フロントエンドに判定結果を返す
    return new Response(JSON.stringify({ success: true, status: serverStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("EdgeFunc Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});