import { CUST_COLS, TASK_COLS, UPDATE_COLS, BLOCKER_COLS, rowToCustomer, customerToRow, rowToObj, objToRow } from './constants.js'

const SID  = import.meta.env.VITE_GOOGLE_SHEET_ID
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const TABS = { Customers: CUST_COLS, Tasks: TASK_COLS, Updates: UPDATE_COLS, Blockers: BLOCKER_COLS }

const auth = t => ({ Authorization: `Bearer ${t}` })
const json = t => ({ ...auth(t), 'Content-Type': 'application/json' })

// ── Bootstrap ─────────────────────────────────────────────────────────────────
export async function ensureSheets(token) {
  const meta = await fetch(`${BASE}/${SID}`, { headers: auth(token) }).then(r => r.json())
  const existing = (meta.sheets || []).map(s => s.properties.title)
  const requests = []
  for (const tab of Object.keys(TABS)) {
    if (!existing.includes(tab)) requests.push({ addSheet: { properties: { title: tab } } })
  }
  if (requests.length) {
    await fetch(`${BASE}/${SID}:batchUpdate`, {
      method: 'POST', headers: json(token),
      body: JSON.stringify({ requests })
    })
  }
  // Write headers to each tab if missing
  for (const [tab, cols] of Object.entries(TABS)) {
    const r = await fetch(`${BASE}/${SID}/values/${tab}!A1:Z1`, { headers: auth(token) }).then(r => r.json())
    if (!r.values || r.values[0]?.[0] !== cols[0]) {
      await fetch(`${BASE}/${SID}/values/${tab}!A1?valueInputOption=RAW`, {
        method: 'PUT', headers: json(token),
        body: JSON.stringify({ values: [cols] })
      })
    }
  }
}

// ── Generic helpers ───────────────────────────────────────────────────────────
async function readRows(token, tab) {
  const r = await fetch(`${BASE}/${SID}/values/${tab}!A2:Z`, { headers: auth(token) })
  const d = await r.json()
  return d.values?.filter(r => r[0]) || []
}

async function appendRow(token, tab, row) {
  await fetch(`${BASE}/${SID}/values/${tab}!A2:Z:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST', headers: json(token), body: JSON.stringify({ values: [row] })
  })
}

async function updateRow(token, tab, rowIndex, row) {
  const r = rowIndex + 1
  await fetch(`${BASE}/${SID}/values/${tab}!A${r}:Z${r}?valueInputOption=RAW`, {
    method: 'PUT', headers: json(token), body: JSON.stringify({ values: [row] })
  })
}

async function deleteRow(token, tab, rowIndex) {
  const meta = await fetch(`${BASE}/${SID}`, { headers: auth(token) }).then(r => r.json())
  const sheet = meta.sheets.find(s => s.properties.title === tab)
  if (!sheet) throw new Error(`Tab ${tab} not found`)
  await fetch(`${BASE}/${SID}:batchUpdate`, {
    method: 'POST', headers: json(token),
    body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 } } }] })
  })
}

// ── Customers ─────────────────────────────────────────────────────────────────
export async function fetchCustomers(token) {
  const rows = await readRows(token, 'Customers')
  return rows.map(rowToCustomer)
}
export async function appendCustomer(token, c) {
  await appendRow(token, 'Customers', customerToRow(c))
}
export async function updateCustomer(token, c, idx) {
  await updateRow(token, 'Customers', idx + 1, customerToRow(c))
}
export async function deleteCustomer(token, idx) {
  await deleteRow(token, 'Customers', idx)
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export async function fetchTasks(token) {
  const rows = await readRows(token, 'Tasks')
  return rows.map(r => rowToObj(TASK_COLS, r))
}
export async function appendTask(token, t) {
  await appendRow(token, 'Tasks', objToRow(TASK_COLS, t))
}
export async function updateTask(token, t, rows) {
  const idx = rows.findIndex(r => r.id === t.id)
  if (idx === -1) throw new Error('Task not found')
  await updateRow(token, 'Tasks', idx + 1, objToRow(TASK_COLS, t))
}
export async function deleteTask(token, id, rows) {
  const idx = rows.findIndex(r => r.id === id)
  if (idx === -1) throw new Error('Task not found')
  await deleteRow(token, 'Tasks', idx)
}

// ── Updates ───────────────────────────────────────────────────────────────────
export async function fetchUpdates(token) {
  const rows = await readRows(token, 'Updates')
  return rows.map(r => rowToObj(UPDATE_COLS, r))
}
export async function appendUpdate(token, u) {
  await appendRow(token, 'Updates', objToRow(UPDATE_COLS, u))
}
export async function deleteUpdate(token, id, rows) {
  const idx = rows.findIndex(r => r.id === id)
  if (idx === -1) throw new Error('Update not found')
  await deleteRow(token, 'Updates', idx)
}

// ── Blockers ──────────────────────────────────────────────────────────────────
export async function fetchBlockers(token) {
  const rows = await readRows(token, 'Blockers')
  return rows.map(r => rowToObj(BLOCKER_COLS, r))
}
export async function appendBlocker(token, b) {
  await appendRow(token, 'Blockers', objToRow(BLOCKER_COLS, b))
}
export async function updateBlocker(token, b, rows) {
  const idx = rows.findIndex(r => r.id === b.id)
  if (idx === -1) throw new Error('Blocker not found')
  await updateRow(token, 'Blockers', idx + 1, objToRow(BLOCKER_COLS, b))
}
export async function deleteBlocker(token, id, rows) {
  const idx = rows.findIndex(r => r.id === id)
  if (idx === -1) throw new Error('Blocker not found')
  await deleteRow(token, 'Blockers', idx)
}
