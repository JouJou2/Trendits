import ExcelJS from 'exceljs';

/**
 * Builds the product spreadsheet used for both bulk export and the blank import
 * template, so the two can never drift apart.
 *
 * Layout: row 1 is a title banner, row 2 a one-line instruction, row 3 the
 * headers, and data starts at row 4. The importer locates the header row by
 * looking for a known column name rather than assuming row 1, so older sheets
 * still import.
 */

export const HEADER_ROW = 3;
export const FIRST_DATA_ROW = 4;
const LAST_VALIDATED_ROW = 600;

const BRAND_BLUE = 'FF0452C8';
const BRAND_DARK = 'FF10162F';
const REQUIRED_FILL = 'FFE7EFFF';
const LOCKED_FILL = 'FFF1F3F7';
const BANNER_TEXT = 'FFFFFFFF';

export interface SheetColumn {
  header: string;
  key: string;
  width: number;
  /** Required fields get a tinted header and a * so they read at a glance. */
  required?: boolean;
  /** Vendors may not edit these — commission, ownership and earned reputation. */
  staffOnly?: boolean;
  note: string;
}

export const PRODUCT_COLUMNS: SheetColumn[] = [
  { header: 'ID', key: 'id', width: 16,
    note: 'Leave blank for a new product. Keep the existing value to update one.' },
  { header: 'Title', key: 'title', width: 34, required: true,
    note: 'The product name shoppers see. Be specific: "JBL BT720 Wireless Headphones" beats "Headphones".' },
  { header: 'Brand', key: 'brand', width: 20,
    note: 'Manufacturer or label. Helps shoppers find you by brand search.' },
  { header: 'Price (USD)', key: 'price', width: 13, required: true,
    note: 'Numbers only, no $ sign. Use a dot for cents, e.g. 24.99' },
  { header: 'Old Price', key: 'oldPrice', width: 12,
    note: 'Optional. The price before discount — shows as a struck-through price. Leave blank if not on sale.' },
  { header: 'Description', key: 'description', width: 46,
    note: 'What it is, what it fits, what is in the box. A few sentences is plenty.' },
  { header: 'Category', key: 'category', width: 18, required: true,
    note: 'Pick from the dropdown. Anything else is filed as uncategorized.' },
  { header: 'Image URL', key: 'imageUrl', width: 42, required: true,
    note: 'A Google Drive share link works, as long as the file is shared with "Anyone with the link". The image is copied into Trendit on import.' },
  { header: 'Stock', key: 'stock', width: 10, required: true,
    note: 'How many units you have. 0 shows the product as out of stock.' },
  { header: 'Featured', key: 'featured', width: 11,
    note: 'Yes or No. Featured products can appear on the homepage.' },
  { header: 'Vendor ID', key: 'vendorId', width: 26, staffOnly: true,
    note: 'Your store id — filled in automatically. Do not change it, or the product will not appear in your store.' },
  { header: 'Fees %', key: 'fees', width: 10, staffOnly: true,
    note: 'Trendit commission. Set by Trendit, not by vendors.' },
  { header: 'Rating', key: 'rating', width: 9, staffOnly: true,
    note: 'Earned from real customer reviews. Not editable.' },
  { header: 'Reviews', key: 'reviews', width: 10, staffOnly: true,
    note: 'Number of customer reviews. Not editable.' },
];

const colLetter = (index: number) => String.fromCharCode(65 + index); // A..N, we have 14

export interface ProductRowData {
  id: string;
  title: string;
  brand: string;
  price: number | string;
  oldPrice: number | string;
  description: string;
  category: string;
  imageUrl: string;
  stock: number | string;
  featured: string;
  vendorId: string;
  fees: number | string;
  rating: number | string;
  reviews: number | string;
}

export interface BuildOptions {
  sheetName: string;
  /** Shown in the banner, e.g. "Product export" or "Product upload template". */
  title: string;
  categories: string[];
  rows: ProductRowData[];
  /** When set, Vendor ID is pre-filled and locked to this store. */
  lockedVendorId?: string;
  /** Admins may edit commission and reputation columns; vendors may not. */
  isStaff: boolean;
}

export const buildProductWorkbook = async ({
  sheetName, title, categories, rows, lockedVendorId, isStaff,
}: BuildOptions): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Trendit';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', xSplit: 2, ySplit: HEADER_ROW }],
  });

  sheet.columns = PRODUCT_COLUMNS.map(c => ({ key: c.key, width: c.width }));
  const lastCol = colLetter(PRODUCT_COLUMNS.length - 1);

  // ── Row 1: banner ─────────────────────────────────────────────────────────
  sheet.mergeCells(`A1:${lastCol}1`);
  const banner = sheet.getCell('A1');
  banner.value = `TRENDIT  ·  ${title}`;
  banner.font = { name: 'Calibri', size: 14, bold: true, color: { argb: BANNER_TEXT } };
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
  banner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 30;

  // ── Row 2: one-line instruction ───────────────────────────────────────────
  sheet.mergeCells(`A2:${lastCol}2`);
  const hint = sheet.getCell('A2');
  hint.value =
    'Blue columns are required. Grey columns are managed by Trendit and locked. '
    + 'Hover any heading for help. Start typing on row 4 — one product per row.';
  hint.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF5A6478' } };
  hint.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } };
  hint.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 22;

  // ── Row 3: headers ────────────────────────────────────────────────────────
  const headerRow = sheet.getRow(HEADER_ROW);
  PRODUCT_COLUMNS.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.required ? `${col.header} *` : col.header;
    cell.font = {
      name: 'Calibri', size: 11, bold: true,
      color: { argb: col.staffOnly ? 'FF6B7280' : BRAND_DARK },
    };
    cell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: col.staffOnly ? LOCKED_FILL : col.required ? REQUIRED_FILL : 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: false };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD8DEE9' } },
      bottom: { style: 'medium', color: { argb: BRAND_BLUE } },
      left: { style: 'thin', color: { argb: 'FFD8DEE9' } },
      right: { style: 'thin', color: { argb: 'FFD8DEE9' } },
    };
    // Excel shows this as a hover comment on the heading.
    cell.note = col.note;
  });
  headerRow.height = 24;
  headerRow.commit();

  // ── Data ──────────────────────────────────────────────────────────────────
  rows.forEach((row, index) => {
    const target = sheet.getRow(FIRST_DATA_ROW + index);
    PRODUCT_COLUMNS.forEach((col, colIndex) => {
      target.getCell(colIndex + 1).value = (row as unknown as Record<string, unknown>)[col.key] as never;
    });
    // Subtle banding so the eye can track a long row across 14 columns.
    if (index % 2 === 1) {
      PRODUCT_COLUMNS.forEach((_, colIndex) => {
        target.getCell(colIndex + 1).fill = {
          type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFD' },
        };
      });
    }
    target.commit();
  });

  sheet.autoFilter = { from: `A${HEADER_ROW}`, to: `${lastCol}${HEADER_ROW}` };

  // ── Lookup lists for the dropdowns ────────────────────────────────────────
  const lists = workbook.addWorksheet('_lists');
  lists.state = 'veryHidden';
  categories.forEach((category, index) => { lists.getCell(`A${index + 1}`).value = category; });
  lists.getCell('B1').value = 'Yes';
  lists.getCell('B2').value = 'No';

  const indexOf = (key: string) => PRODUCT_COLUMNS.findIndex(c => c.key === key);
  const letterOf = (key: string) => colLetter(indexOf(key));

  const lastRow = Math.max(LAST_VALIDATED_ROW, FIRST_DATA_ROW + rows.length + 50);

  for (let row = FIRST_DATA_ROW; row <= lastRow; row++) {
    sheet.getCell(`${letterOf('category')}${row}`).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: [`'_lists'!$A$1:$A$${Math.max(categories.length, 1)}`],
      showErrorMessage: true, errorTitle: 'Pick a category',
      error: 'Choose one of the categories from the dropdown.',
    };

    sheet.getCell(`${letterOf('featured')}${row}`).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`'_lists'!$B$1:$B$2`],
      showErrorMessage: true, errorTitle: 'Yes or No',
      error: 'Featured must be Yes or No.',
    };

    sheet.getCell(`${letterOf('price')}${row}`).dataValidation = {
      type: 'decimal', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true,
      showErrorMessage: true, errorTitle: 'Price must be a number',
      error: 'Enter digits only — no $ sign, no text. Use a dot for cents, e.g. 24.99',
    };

    sheet.getCell(`${letterOf('stock')}${row}`).dataValidation = {
      type: 'whole', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true,
      showErrorMessage: true, errorTitle: 'Stock must be a whole number',
      error: 'Enter how many units you have, e.g. 25',
    };

    // Vendor id is theirs, pre-filled, and must not be retyped.
    if (lockedVendorId) {
      sheet.getCell(`${letterOf('vendorId')}${row}`).value = lockedVendorId;
    }

    // Lock what the vendor must not set; unlock everything else.
    PRODUCT_COLUMNS.forEach((col, colIndex) => {
      const locked = col.staffOnly && !isStaff;
      const cell = sheet.getCell(`${colLetter(colIndex)}${row}`);
      cell.protection = { locked: Boolean(locked) };
      if (locked) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LOCKED_FILL } };
      }
    });
  }

  // Sheet protection stops accidental edits to locked cells; it is a usability
  // guard, not a security boundary — the real enforcement is in Firestore rules.
  await sheet.protect('trendit', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false, formatColumns: false, formatRows: false,
    insertColumns: false, deleteColumns: false,
    insertRows: true, deleteRows: true,
    sort: true, autoFilter: true, pivotTables: false,
  });

  // ── Instructions sheet ────────────────────────────────────────────────────
  const help = workbook.addWorksheet('How to fill this in');
  help.columns = [{ width: 22 }, { width: 86 }];

  help.mergeCells('A1:B1');
  const helpBanner = help.getCell('A1');
  helpBanner.value = 'TRENDIT  ·  How to fill in your product sheet';
  helpBanner.font = { size: 14, bold: true, color: { argb: BANNER_TEXT } };
  helpBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
  helpBanner.alignment = { vertical: 'middle', indent: 1 };
  help.getRow(1).height = 30;

  const helpLines: [string, string][] = [
    ['', ''],
    ['Where to type', `Go to the "${sheetName}" tab. Headers are on row ${HEADER_ROW}; start typing on row ${FIRST_DATA_ROW}. One product per row.`],
    ['Required', 'Columns marked * and tinted blue must be filled: Title, Price, Category, Image URL, Stock.'],
    ['Locked columns', 'Grey columns (Vendor ID, Fees %, Rating, Reviews) are managed by Trendit. Vendor ID is already filled in for you.'],
    ['Prices', 'Digits only — no $ sign and no spaces. Use a dot for cents: 24.99, not 24,99.'],
    ['Old Price', 'Only fill this when the item is on sale. It shows struck through next to the new price.'],
    ['Category', 'Click the cell and pick from the dropdown. Typing something else files the product as uncategorized.'],
    ['', ''],
    ['Images', 'Paste a link to the photo. A Google Drive link is fine.'],
    ['  Important', 'In Drive: right-click the file → Share → General access → "Anyone with the link". Without this we cannot read the image and the product imports without a photo.'],
    ['  What happens', 'On import we download the photo and store a copy on Trendit, so your listing keeps working even if you later move or delete the file.'],
    ['  Limits', 'JPG, PNG, WEBP, GIF or AVIF, up to 8MB each.'],
    ['', ''],
    ['Updating products', 'Export your products, change what you need, and import the same file back. Keep the ID column as it is so we update instead of creating duplicates.'],
    ['Adding products', 'Leave the ID blank on new rows and we will create them.'],
    ['', ''],
    ['Before you import', 'Check: every required column filled, prices are numbers, and Drive links are shared with "Anyone with the link".'],
    ['Need help', 'Contact Trendit support and attach your sheet — we will take a look.'],
  ];

  helpLines.forEach(([label, text], index) => {
    const row = help.getRow(index + 2);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, size: 11, color: { argb: BRAND_DARK } };
    row.getCell(1).alignment = { vertical: 'top', indent: 1 };
    row.getCell(2).value = text;
    row.getCell(2).font = { size: 11, color: { argb: 'FF3A4252' } };
    row.getCell(2).alignment = { vertical: 'top', wrapText: true };
    if (text.length > 95) row.height = 30;
    row.commit();
  });

  return workbook;
};

/** Shared download helper so both exports behave identically. */
export const downloadWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
