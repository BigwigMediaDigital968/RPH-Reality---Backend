import { google } from 'googleapis';
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const credentials = JSON.parse(
  Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64,
    "base64"
  ).toString("utf-8")
);


// 1. Extract Spreadsheet ID from the URL
function getSheetIdFromUrl(url) {
    // Stop matching at '/', '?', or '#' to avoid capturing query params
    const matches = /\/d\/([a-zA-Z0-9\-_]+)(?:\/|#|\?|$)/.exec(url);
    if (!matches) return null;

    const id = matches[1];
    // Validate minimum length for a real Sheet ID
    if (id.length < 15) return null;

    return id;
}

async function getNumericSheetId(spreadsheetId, sheetName = SHEET_NAME) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets.find(
        s => s.properties.title === sheetName
    );
    if (!sheet) throw new Error(`Sheet tab "${sheetName}" not found`);
    return sheet.properties.sheetId;
}

// 2. Initialize Authentication
const auth = new google.auth.GoogleAuth({
    //keyFile: path.join(__dirname, '../google-service-key.json'),
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const SHEET_NAME = 'Sheet1';

const HEADERS = [
    'Created At', 'Assigned At', 'Name', 'Phone', 'Email',
    'City', 'Purpose', 'Note', 'Admin Note', 'Source'
];

/**
 * Checks whether the sheet is completely empty (no data at all).
 */
async function isSheetEmpty(spreadsheetId) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAME}!A1:Z1`,
    });
    const rows = res.data.values;
    return !rows || rows.length === 0 || rows[0].every(cell => cell === '');
}

/**
 * Writes the header row and applies formatting:
 *  - Bold, white text on dark-blue background
 *  - Frozen top row
 *  - Auto-resized columns
 */
async function initializeSheetHeaders(spreadsheetId) {
    const numericSheetId = await getNumericSheetId(spreadsheetId);

    // 1. Write header values
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS] },
    });

    // 2. Apply formatting ONLY to row 1 (header), nothing else
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                // Bold header text only — no background color
                {
                    repeatCell: {
                        range: {
                            sheetId:          numericSheetId,
                            startRowIndex:    0,  // row 1 only
                            endRowIndex:      1,  // exclusive — stops before row 2
                            startColumnIndex: 0,
                            endColumnIndex:   HEADERS.length, // exact column count, no overflow
                        },
                        cell: {
                            userEnteredFormat: {
                                textFormat: {
                                    // bold:     true,
                                    fontSize: 11,
                                },
                                horizontalAlignment: 'CENTER',
                            },
                        },
                        // Only touch textFormat + alignment — nothing else inherited by data rows
                        fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
                    },
                },
                // Freeze header row
                {
                    updateSheetProperties: {
                        properties: {
                            sheetId:        numericSheetId,
                            gridProperties: { frozenRowCount: 1 },
                        },
                        fields: 'gridProperties.frozenRowCount',
                    },
                },
                // Auto-resize columns to fit header text
                {
                    autoResizeDimensions: {
                        dimensions: {
                            sheetId:    numericSheetId,
                            dimension:  'COLUMNS',
                            startIndex: 0,
                            endIndex:   HEADERS.length,
                        },
                    },
                },
            ],
        },
    });

    console.log(`[Sheets] Headers initialized for spreadsheet: ${spreadsheetId}`);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export const appendLeadToEmployeeSheet = async (employeeSheetUrl, leadData) => {
    const spreadsheetId = getSheetIdFromUrl(employeeSheetUrl);
    if (!spreadsheetId) throw new Error("Invalid Google Sheet URL");

    const empty = await isSheetEmpty(spreadsheetId);
    if (empty) {
        await initializeSheetHeaders(spreadsheetId);
    }

    // Always send as 2D array
    const values = Array.isArray(leadData[0]) ? leadData : [leadData];

    const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range:            `${SHEET_NAME}!A1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody:      { values },
    });

    console.log(`[Sheets] Lead appended — ${response.data.updates?.updatedRows ?? 1} row(s) written`);
    return response.data;
};
