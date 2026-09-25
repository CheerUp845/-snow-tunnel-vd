# 雪山隧道左右車道 V0.2

V0.2 顯示雪山隧道北上／南下左右車道代表速度與目前建議。後端使用 TDX 高速公路 VD 逐車道資料，清洗後以各方向有效成對 VD 的中位數作為代表速度，並由同一個 Node 服務直接提供手機版網頁。

## 功能
- 北上／南下左線、右線速度與差值
- `delta >= 5 km/h` 才建議較快車道，否則顯示差異不大
- 顯示資料時間與有效 VD 數
- 手機 Safari 首頁與 iOS App 都可使用；每 60 秒自動更新
- 超過 180 秒、資料不足或連線失敗時，不提供可執行的車道建議

V0.2 不含 GPS、導航、CarPlay、速度預測、CCTV、帳號與歷史分析。

## Backend
需求：Node.js 22。

```bash
cd backend
cp .env.example .env
# 填入 TDX_CLIENT_ID / TDX_CLIENT_SECRET
npm install
npm test
npm run build
npm run dev
```

`.env`：
```dotenv
TDX_CLIENT_ID=your-client-id
TDX_CLIENT_SECRET=your-client-secret
PORT=8080
```

手機網頁：`GET http://127.0.0.1:8080/`

API：`GET http://127.0.0.1:8080/api/snow-tunnel`

## 雲端部署

repo 根目錄附 `render.yaml`。在 Render 建立 Blueprint / Web Service 後，只需要設定兩個 Secret：

```text
TDX_CLIENT_ID
TDX_CLIENT_SECRET
```

部署完成後，直接以 iPhone Safari 開啟 Render 提供的 HTTPS 網址即可；TDX 憑證只存在伺服器端，不會送到瀏覽器。

## iOS
需求：macOS、Xcode、XcodeGen，iOS 17+。

```bash
brew install xcodegen
cd ios
xcodegen generate
open SnowTunnel.xcodeproj
```

Debug 預設後端為 `http://127.0.0.1:8080/`，適用 Simulator。Release 必須自行設定 `BACKEND_BASE_URL` 且只能使用 HTTPS。

## 下一階段
- V0.3：GPS＋目前行駛方向
- V0.4：依 ETA、VD 趨勢與空間傳播預測抵達時左右線速度
