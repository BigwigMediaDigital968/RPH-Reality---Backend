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

// 2. Initialize Authentication
const auth = new google.auth.GoogleAuth({
    //keyFile: path.join(__dirname, '../google-service-key.json'),
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// 3. Function to Append Lead
export const appendLeadToEmployeeSheet = async (employeeSheetUrl, leadData) => {
    const spreadsheetId = getSheetIdFromUrl(employeeSheetUrl);
    if (!spreadsheetId) throw new Error("Invalid Google Sheet URL");

    // Ensure leadData is always a 2D array: [[col1, col2, col3, ...]]
    const values = Array.isArray(leadData[0]) ? leadData : [leadData];

    const request = {
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
    };

    try {
        const response = await sheets.spreadsheets.values.append(request);
        return response.data;
    } catch (err) {
        console.error('The API returned an error: ' + err);
        throw err;
    }
};