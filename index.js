require("dotenv").config()

const express = require("express")
const fetch = require("node-fetch")
const Database = require("better-sqlite3")
const path = require("path")
const fs = require("fs")

const app = express()

const GROUP_ID = process.env.GROUP_ID || "745994551"
const COOKIE = process.env.ROBLOX_COOKIE
const PORT = Number(process.env.PORT || 3000)

const DATA_PATH = process.env.DATA_PATH || "."
if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH, { recursive: true })

const dbPath = path.join(DATA_PATH, "sales.db")
const db = new Database(dbPath)

db.prepare(`
CREATE TABLE IF NOT EXISTS sales (
  idHash TEXT PRIMARY KEY,
  created TEXT,
  buyer TEXT,
  item TEXT,
  robux INTEGER,
  pending INTEGER
)
`).run()

const insert = db.prepare(`
INSERT OR IGNORE INTO sales
(idHash, created, buyer, item, robux, pending)
VALUES (?, ?, ?, ?, ?, ?)
`)

async function pollSales() {
  if (!COOKIE) return

  const res = await fetch(
    `https://economy.roblox.com/v2/groups/${GROUP_ID}/transactions?transactionType=Sale&limit=100`,
    { headers: { Cookie: `.ROBLOSECURITY=${COOKIE}` } }
  )

  const json = await res.json()
  if (!json?.data) return

  for (const t of json.data) {
    insert.run(
      t.idHash,
      t.created,
      t.agent?.name || "Unknown",
      t.details?.name || "Unknown",
      t.currency?.amount || 0,
      t.isPending ? 1 : 0
    )
  }
}

pollSales()
setInterval(pollSales, 60_000)

app.get("/api/sales", (req, res) => {
  res.json(
    db.prepare(
      "SELECT * FROM sales ORDER BY datetime(created) DESC LIMIT 200"
    ).all()
  )
})

app.use(express.static("public"))

app.listen(PORT, () => {
  console.log("Dashboard running on port", PORT)
})
