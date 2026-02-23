const SPREADSHEET_ID = "1-lZ7_s-knQc0itESFkSjR3LuiWc0OWaENDcgAWNVJ0w";
const SPREADSHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;

function decodeEscaped(input) {
  return input
    .replace(/\\\\/g, "\\")
    .replace(/\\\"/g, '"')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_value, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .trim();
}

function parseTopSnapshot(html) {
  const match = html.match(/"topsnapshot":\[(.*?)\],"revision":/s);
  return match ? match[1] : html;
}

function extractSheets(html) {
  const source = parseTopSnapshot(html);
  const regex = /\[\d+,"\[\d+,0,\\"(\d+)\\",\[\{\\"1\\":\[\[0,0,\\"(.*?)\\"\],/g;
  const sheets = [];
  const seenGids = new Set();

  let found;
  while ((found = regex.exec(source)) !== null) {
    const gid = Number(found[1]);
    const name = decodeEscaped(found[2]).trim();

    if (!Number.isFinite(gid) || gid <= 0 || !name || seenGids.has(gid)) {
      continue;
    }

    sheets.push({
      gid,
      name,
    });
    seenGids.add(gid);
  }

  return sheets;
}

export default async function handler(_req, res) {
  try {
    const response = await fetch(SPREADSHEET_EDIT_URL, {
      headers: {
        "user-agent": "between-the-lines/1.0",
      },
    });

    if (!response.ok) {
      res.status(response.status).json({
        error: "Failed to read spreadsheet metadata.",
      });
      return;
    }

    const html = await response.text();
    const sheets = extractSheets(html);

    if (sheets.length === 0) {
      res.status(502).json({
        error: "No sheets discovered from spreadsheet metadata.",
      });
      return;
    }

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({
      spreadsheetId: SPREADSHEET_ID,
      sheets,
    });
  } catch {
    res.status(500).json({
      error: "Unexpected error while loading spreadsheet metadata.",
    });
  }
}
