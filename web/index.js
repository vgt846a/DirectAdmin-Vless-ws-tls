// ================= 仅需修改两个变量 =================
const UUID   = (process.env.UUID   || "0cbbd5b1-2ba6-405f-b71d-03c92cb7b6e8").trim();
const DOMAIN = (process.env.DOMAIN || "mywork.dpdns.org").trim();

// ================= 基础设置 =================
const NAME = "DirectAdmin-eishare";
const BEST_DOMAINS = [
  "www.visa.cn", "usa.visa.com", "www.wto.org", "shopify.com",
  "time.is", "www.digitalocean.com", "www.visa.com.hk", "www.udemy.com"
];

console.log("DA-BOOT: Starting lightweight VLESS-WS-TLS ...");

// ================= 模块 =================
const http = require("http");
const net = require("net");
const { WebSocketServer } = require("ws");

// ================= 节点生成 =================
function genLink(host) {
  return `vless://${UUID}@${host}:443?encryption=none&security=tls&sni=${DOMAIN}&type=ws&host=${DOMAIN}&path=%2F#${NAME}`;
}

// ================= HTTP 服务 =================
const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end(`VLESS-WS-TLS Running\n访问 /${UUID} 查看全部节点\n`);
  }

  if (req.url === `/${UUID}`) {
    let txt = "═════ easyshare VLESS-WS-TLS 节点 ═════\n\n";
    BEST_DOMAINS.forEach(d => txt += genLink(d) + "\n\n");
    txt += "节点已全部生成，可直接复制使用。\n";
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end(txt);
  }

  res.writeHead(404);
  res.end("404 Not Found");
});

// ================= WebSocket 后端（精简+稳定版本） =================
const wss = new WebSocketServer({ server });
const uuidHex = UUID.replace(/-/g, "").toLowerCase();

wss.on("connection", ws => {
  ws.once("message", data => {
    // ====== 最精简 UUID 校验 ======
    if (data.length < 18) return ws.close();
    const rec = data.slice(1, 17).toString("hex");
    if (rec !== uuidHex) return ws.close();

    // 回复握手成功
    ws.send(Buffer.from([data[0], 0]));

    // ====== 读取目标地址 ======
    let p = 17 + 2; // skip version & optLen
    const port = data.readUInt16BE(p - 2);
    const atyp = data[p++];

    let host;
    if (atyp === 1) host = Array.from(data.slice(p, p += 4)).join(".");
    else if (atyp === 2) {
      const len = data[p++];
      host = data.slice(p, p += len).toString();
    } else return ws.close();

    // ====== 建立 TCP ======
    const tcp = net.connect({ host, port }, () => {
      tcp.write(data.slice(p)); // 余量数据写入
    });

    tcp.on("error", () => ws.close());

    // WS <-> TCP 双向转发（稳定写法）
    ws.on("message", msg => tcp.write(msg));
    tcp.on("data", d => ws.send(d));
    ws.on("close", () => tcp.destroy());
    tcp.on("close", () => ws.close());
  });
});

// ================= 启动 =================
server.listen(3000, "0.0.0.0", () => {
  console.log("===============================================");
  console.log(" VLESS-WS-TLS √ 启动成功（精简稳定版）");
  console.log("===============================================");
  console.log("\n节点一览：\n");
  BEST_DOMAINS.forEach((d, i) => console.log(`${i+1}. ${genLink(d)}\n`));
  console.log(`访问路径： /${UUID}\n`);
});
