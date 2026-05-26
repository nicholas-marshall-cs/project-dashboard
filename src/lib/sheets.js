// Google Sheets API service
// All reads and writes go through here

import { SHEET_COLUMNS, rowToCustomer, customerToRow } from './constants.js'

const SHEET_ID   = import.meta.env.VITE_GOOGLE_SHEET_ID
const SHEET_NAME = 'Customers'
const BASE_URL   = 'https://sheets.googleapis.com/v4/spreadsheets'

function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

// Ensure the header row exists
export async function ensureSheet(token) {
  const url = `${BASE_URL}/${SHEET_ID}/values/${SHEET_NAME}!A1:Z1`
  const res = await fetch(url, { headers: authHeader(token) })
  if (!res.ok) {
    // Sheet tab may not exist yet — create it
    await createSheetTab(token)
    await writeHeaders(token)
    return
  }
  const data = await res.json()
  if (!data.values || data.values[0]?.[0] !== 'id') {
    await writeHeaders(token)
  }
}

async function createSheetTab(token) {
  const url = `${BASE_URL}/${SHEET_ID}:batchUpdate`
  await fetch(url, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: SHEET_NAME } } }]
    })
  })
}

async function writeHeaders(token) {
  const url = `${BASE_URL}/${SHEET_ID}/values/${SHEET_NAME}!A1?valueInputOption=RAW`
  await fetch(url, {
    method: 'PUT',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [SHEET_COLUMNS] })
  })
}

export async function fetchCustomers(token) {
  const url = `${BASE_URL}/${SHEET_ID}/values/${SHEET_NAME}!A2:Z`
  const res = await fetch(url, { headers: authHeader(token) })
  if (!res.ok) throw new Error('Failed to fetch customers')
  const data = await res.json()
  if (!data.values) return []
  return data.values.filter(r => r[0]).map(rowToCustomer)
}

export async function appendCustomer(token, customer) {
  const url = `${BASE_URL}/${SHEET_ID}/values/${SHEET_NAME}!A2:Z:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [customerToRow(customer)] })
  })
  if (!res.ok) throw new Error('Failed to append customer')
}

export async function updateCustomer(token, customer, rowIndex) {
  // rowIndex is 1-based, data starts at row 2
  const row = rowIndex + 1
  const url = `${BASE_URL}/${SHEET_ID}/values/${SHEET_NAME}!A${row}:Z${row}?valueInputOption=RAW`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [customerToRow(customer)] })
  })
  if (!res.ok) throw new Error('Failed to update customer')
}


export async function deleteCustomerRow(token, rowIndex) {
  const sheetRowIndex = rowIndex + 1
  const metaRes = await fetch(`${BASE_URL}/${SHEET_ID}`, { headers: authHeader(token) })
  if (!metaRes.ok) throw new Error('Failed to fetch sheet metadata')
  const meta = await metaRes.json()
  const sheet = meta.sheets.find(s => s.properties.title === SHEET_NAME)
  if (!sheet) throw new Error('Sheet tab not found')
  const res = await fetch(`${BASE_URL}/${SHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { ...authHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: sheetRowIndex, endIndex: sheetRowIndex + 1 } } }]
    })
  })
  if (!res.ok) throw new Error('Failed to delete row')
}
