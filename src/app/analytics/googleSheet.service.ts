import { GoogleSpreadsheet } from 'google-spreadsheet';
import creds from './googleSheetCredentials.json';

const SPREADSHEET_ID = '16KKMYDbLtgcvSyRu5SFf6oNSfBulaUAj5HhzuFKFEks';

function formatDateToCustomTimezoneString(date: Date, offsetHours: number): string {
  const adjusted = new Date(date.getTime() + offsetHours * 60 * 60 * 1000);

  const year = adjusted.getUTCFullYear();
  const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjusted.getUTCDate()).padStart(2, '0');
  const hours = String(adjusted.getUTCHours()).padStart(2, '0');
  const minutes = String(adjusted.getUTCMinutes()).padStart(2, '0');
  const seconds = String(adjusted.getUTCSeconds()).padStart(2, '0');

  const offset = offsetHours >= 0
    ? `+${String(offsetHours).padStart(2, '0')}00`
    : `-${String(Math.abs(offsetHours)).padStart(2, '0')}00`;

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${offset}`;
}

async function sendConversionToSheet(conversion: {
  gclid: string;
  name: string;
  value: number;
  currency?: string;
  timestamp?: Date;
}) {
  try {
    const adjustedTime = formatDateToCustomTimezoneString(conversion.timestamp ?? new Date(), 2); // UTC+2

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    await sheet.addRow({
      'Google Click ID': conversion.gclid,
      'Conversion Name': conversion.name,
      'Conversion Time': adjustedTime,
      'Conversion Value': conversion.value,
      'Conversion Currency': conversion.currency?.toUpperCase() || 'EUR',
    });
  } catch (error) {
    console.error('❌ Error al enviar conversión a Google Sheets:', error);
  }
}

export { sendConversionToSheet };
