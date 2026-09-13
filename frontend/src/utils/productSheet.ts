import ExcelJS from 'exceljs';
import type { ExportRow } from './productImport';

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
const LAST_VALIDATED_ROW = 800;

const BRAND_BLUE = 'FF0452C8';
const BRAND_DARK = 'FF10162F';
const REQUIRED_FILL = 'FFE7EFFF';
const LOCKED_FILL = 'FFF1F3F7';
const FORMULA_FILL = 'FFEAF7EE';
const VARIANT_FILL = 'FFFFF6E5';
const BANNER_TEXT = 'FFFFFFFF';

export interface SheetColumn {
  header: string;
  key: keyof ExportRow;
  width: number;
  /** Required fields get a tinted header and a * so they read at a glance. */
  required?: boolean;
  /** Vendors may not edit these — commission, ownership and earned reputation. */
  staffOnly?: boolean;
  /** Calculated by Excel; nobody types here. */
  formula?: boolean;
  /** Variation columns get their own tint so the Group/Colour/Size trio reads as one idea. */
  variant?: boolean;
  note: string;
}

export const PRODUCT_COLUMNS: SheetColumn[] = [
  { header: 'Group', key: 'group', width: 13, variant: true,
    note: 'Give every row of the same product the same Group, e.g. TSHIRT-01. Each row is then one size and/or colour of it. Leave blank for a simple product with no sizes or colours.' },
  { header: 'ID', key: 'id', width: 16,
    note: 'Leave blank for a new product. Keep the existing value to update one.' },
  { header: 'Title', key: 'title', width: 32, required: true,
    note: 'The product name shoppers see. Be specific: "JBL BT720 Wireless Headphones" beats "Headphones". Use the same title on every row of a Group.' },
  { header: 'Brand', key: 'brand', width: 16,
    note: 'Manufacturer or label. Helps shoppers find you by brand search.' },
  { header: 'Color', key: 'color', width: 12, variant: true,
    note: 'Optional. Each colour becomes its own listing with its own photo, linked to the others so shoppers can switch between them. Only works in categories that use colours.' },
  { header: 'Size', key: 'size', width: 9, variant: true,
    note: 'Optional. One row per size, each with its own Stock. Only works in categories that use sizes.' },
  { header: 'Price', key: 'price', width: 11, required: true,
    note: 'What shoppers pay on the site. Numbers only, no $ sign. A size can have its own price.' },
  { header: 'Commission %', key: 'fees', width: 14, staffOnly: true,
    note: 'Trendit\'s commission, taken out of the Price — shoppers still pay the Price. Set by Trendit for each store, already filled in for you.' },
  { header: 'Trendit Earns', key: 'commissionAmount', width: 13, formula: true,
    note: 'Trendit\'s commission on each sale: Price × Commission %. Calculated automatically — do not type here.' },
  { header: 'Vendor Receives', key: 'vendorAmount', width: 15, formula: true,
    note: 'What the store receives from each sale: Price minus Trendit\'s commission. Calculated automatically — do not type here.' },
  { header: 'Old Price', key: 'oldPrice', width: 11,
    note: 'Optional. The Price before a discount — shows struck through beside the new price. Leave blank if not on sale.' },
  { header: 'Description', key: 'description', width: 40,
    note: 'What it is, what it fits, what is in the box. A few sentences is plenty.' },
  { header: 'Category', key: 'category', width: 24, required: true,
    note: 'Pick from the dropdown. Subcategories appear as "Main › Sub". Whether sizes and colours are allowed depends on the category.' },
  { header: 'Image URL', key: 'imageUrl', width: 40, required: true,
    note: 'A Google Drive share link works, as long as the file is shared with "Anyone with the link". The image is copied into Trendit on import. For colours, put each colour\'s photo on its own rows.' },
  { header: 'Stock', key: 'stock', width: 9, required: true,
    note: 'How many units you have — per size when using sizes. 0 shows it as sold out.' },
  { header: 'Featured', key: 'featured', width: 10,
    note: 'Yes or No. Featured products can appear on the homepage.' },
  { header: 'Vendor ID', key: 'vendorId', width: 26, staffOnly: true,
    note: 'Your store id — filled in automatically. Do not change it, or the product will not appear in your store.' },
  { header: 'Rating', key: 'rating', width: 8, staffOnly: true,
    note: 'Earned from real customer reviews. Not editable.' },
  { header: 'Reviews', key: 'reviews', width: 9, staffOnly: true,
    note: 'Number of customer reviews. Not editable.' },
];

const colLetter = (index: number) => String.fromCharCode(65 + index); // A..S — 19 columns
const indexOf = (key: keyof ExportRow) => PRODUCT_COLUMNS.findIndex(c => c.key === key);
const letterOf = (key: keyof ExportRow) => colLetter(indexOf(key));

/**
 * Excel formulas for one row's commission split; blank until a Price is typed.
 * Commission comes out of the price, matching utils/commission.ts.
 */
const splitFormula = (key: keyof ExportRow, row: number) => {
  const price = `${letterOf('price')}${row}`;
  const commission = `ROUND(${price}*N(${letterOf('fees')}${row})/100,2)`;
  const amount = key === 'commissionAmount' ? commission : `ROUND(${price}-${commission},2)`;
  return `IF(${price}="","",${amount})`;
};

export interface BuildOptions {
  sheetName: string;
  /** Shown in the banner, e.g. "Product export" or "Product upload template". */
  title: string;
  /** Dropdown entries — the label is what appears in the cell. */
  categories: { slug: string; label: string }[];
  rows: ExportRow[];
  /** When set, Vendor ID is pre-filled and locked to this store. */
  lockedVendorId?: string;
  /** A vendor's store commission, pre-filled so the split is right as they type. */
  lockedCommission?: number;
  /** Admins may edit commission and reputation columns; vendors may not. */
  isStaff: boolean;
}

export const buildProductWorkbook = async ({
  sheetName, title, categories, rows, lockedVendorId, lockedCommission, isStaff,
}: BuildOptions): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Trendit';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', xSplit: 3, ySplit: HEADER_ROW }],
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
    'Blue = required. Amber = sizes & colours (same Group = same product). Green = Trendit\'s commission and your share, worked out for you. '
    + 'Grey = set by Trendit. Hover any heading for help. Start on row 4, and see the "How to fill this in" tab.';
  hint.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF5A6478' } };
  hint.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } };
  hint.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 22;

  // ── Row 3: headers ────────────────────────────────────────────────────────
  const headerFill = (col: SheetColumn) =>
    col.formula ? FORMULA_FILL
      : col.staffOnly ? LOCKED_FILL
        : col.required ? REQUIRED_FILL
          : col.variant ? VARIANT_FILL
            : 'FFFFFFFF';

  const headerRow = sheet.getRow(HEADER_ROW);
  PRODUCT_COLUMNS.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.required ? `${col.header} *` : col.header;
    cell.font = {
      name: 'Calibri', size: 11, bold: true,
      color: { argb: col.staffOnly ? 'FF6B7280' : BRAND_DARK },
    };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill(col) } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: false };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD8DEE9' } },
      bottom: { style: 'medium', color: { argb: BRAND_BLUE } },
      left: { style: 'thin', color: { argb: 'FFD8DEE9' } },
      right: { style: 'thin', color: { argb: 'FFD8DEE9' } },
    };
    cell.note = col.note;
  });
  headerRow.height = 24;
  headerRow.commit();

  // ── Data ──────────────────────────────────────────────────────────────────
  rows.forEach((row, index) => {
    const rowNumber = FIRST_DATA_ROW + index;
    const target = sheet.getRow(rowNumber);
    PRODUCT_COLUMNS.forEach((col, colIndex) => {
      const cell = target.getCell(colIndex + 1);
      if (col.formula) {
        cell.value = { formula: splitFormula(col.key, rowNumber), result: row[col.key] as number } as ExcelJS.CellFormulaValue;
      } else {
        cell.value = row[col.key] as ExcelJS.CellValue;
      }
    });
    // Band rows by Group so a product's sizes and colours read as one block.
    target.commit();
  });

  let band = false;
  let previousGroup: string | null = null;
  rows.forEach((row, index) => {
    const groupKey = row.group || `__row${index}`;
    if (groupKey !== previousGroup) band = !band;
    previousGroup = groupKey;
    if (!band) return;
    PRODUCT_COLUMNS.forEach((_, colIndex) => {
      sheet.getRow(FIRST_DATA_ROW + index).getCell(colIndex + 1).fill = {
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFD' },
      };
    });
  });

  sheet.autoFilter = { from: `A${HEADER_ROW}`, to: `${lastCol}${HEADER_ROW}` };

  // ── Lookup lists for the dropdowns ────────────────────────────────────────
  const lists = workbook.addWorksheet('_lists');
  lists.state = 'veryHidden';
  categories.forEach((category, index) => { lists.getCell(`A${index + 1}`).value = category.label; });
  lists.getCell('B1').value = 'Yes';
  lists.getCell('B2').value = 'No';

  const lastRow = Math.max(LAST_VALIDATED_ROW, FIRST_DATA_ROW + rows.length + 100);

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
    for (const key of ['price', 'oldPrice'] as const) {
      sheet.getCell(`${letterOf(key)}${row}`).dataValidation = {
        type: 'decimal', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true,
        showErrorMessage: true, errorTitle: 'Must be a number',
        error: 'Enter digits only — no $ sign, no text. Use a dot for cents, e.g. 24.99',
      };
    }
    sheet.getCell(`${letterOf('stock')}${row}`).dataValidation = {
      type: 'whole', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true,
      showErrorMessage: true, errorTitle: 'Stock must be a whole number',
      error: 'Enter how many units you have, e.g. 25',
    };
    if (isStaff) {
      sheet.getCell(`${letterOf('fees')}${row}`).dataValidation = {
        type: 'decimal', operator: 'between', formulae: [0, 100], allowBlank: true,
        showErrorMessage: true, errorTitle: 'Commission %',
        error: 'Enter a percentage between 0 and 100. Leave blank to use the store\'s rate.',
      };
    }

    // Blank rows still get the split formulas, so they fill in as they type.
    if (row >= FIRST_DATA_ROW + rows.length) {
      for (const key of ['commissionAmount', 'vendorAmount'] as const) {
        sheet.getCell(`${letterOf(key)}${row}`).value =
          { formula: splitFormula(key, row), result: '' } as unknown as ExcelJS.CellFormulaValue;
      }
      if (lockedVendorId) sheet.getCell(`${letterOf('vendorId')}${row}`).value = lockedVendorId;
      if (lockedCommission !== undefined) sheet.getCell(`${letterOf('fees')}${row}`).value = lockedCommission;
    }

    // Lock what nobody types (formulas) and what vendors must not set; unlock the rest.
    PRODUCT_COLUMNS.forEach((col, colIndex) => {
      const locked = col.formula || (col.staffOnly && !isStaff);
      const cell = sheet.getCell(`${colLetter(colIndex)}${row}`);
      cell.protection = { locked: Boolean(locked) };
      if (col.formula) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FORMULA_FILL } };
        cell.numFmt = '"$"#,##0.00';
        cell.font = { bold: true, color: { argb: 'FF1B6B3A' } };
      } else if (locked) {
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
  help.columns = [{ width: 24 }, { width: 92 }];

  help.mergeCells('A1:B1');
  const helpBanner = help.getCell('A1');
  helpBanner.value = 'TRENDIT  ·  How to fill in your product sheet';
  helpBanner.font = { size: 14, bold: true, color: { argb: BANNER_TEXT } };
  helpBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
  helpBanner.alignment = { vertical: 'middle', indent: 1 };
  help.getRow(1).height = 30;

  const section = (text: string): [string, string, boolean] => [text, '', true];
  const line = (label: string, text: string): [string, string, boolean] => [label, text, false];

  const helpLines: [string, string, boolean][] = [
    line('', ''),
    section('THE BASICS'),
    line('Where to type', `Go to the "${sheetName}" tab. Headers are on row ${HEADER_ROW}; start typing on row ${FIRST_DATA_ROW}.`),
    line('Required', 'Columns marked * must be filled on every row: Title, Price, Category, Image URL, Stock.'),
    line('Locked columns', 'Grey columns are managed by Trendit. Your Vendor ID and commission are already filled in.'),
    line('', ''),
    section('PRICING'),
    line('Price', 'What shoppers pay on Trendit — exactly the price shown on the site. Digits only: 24.99, not $24,99.'),
    line('Commission %', 'Trendit\'s commission for your store. It is taken out of the Price, never added on top.'),
    line('Trendit Earns', 'Worked out for you as you type: Price × Commission %.'),
    line('Vendor Receives', 'Worked out for you: Price minus Trendit\'s commission. This is what your store receives per sale.'),
    line('  Example', 'Price 10, Commission 8%  →  shopper pays $10.00, Trendit earns $0.80, you receive $9.20.'),
    line('Old Price', 'Only when on sale — the Price before the discount. It shows struck through on the site.'),
    line('', ''),
    section('SIZES AND COLOURS'),
    line('Simple product', 'No sizes or colours? One row, Group left blank. Done.'),
    line('Sizes', 'One row per size. Give all of them the same Group and Title. Each size has its own Stock, and can have its own Price.'),
    line('Colours', 'Add a Color on each row. Each colour becomes its own listing with its own photo, linked so shoppers can switch colour on the product page.'),
    line('Both', 'One row per colour AND size, all sharing one Group. See the example below.'),
    line('  Example', 'Group TEE-01 · Black · M · 20 · stock 5'),
    line('', 'Group TEE-01 · Black · L · 20 · stock 3'),
    line('', 'Group TEE-01 · White · M · 20 · stock 4        →  2 listings (Black, White); Black has sizes M and L.'),
    line('Allowed?', 'Sizes and colours only work in categories set up for them. If a category does not use them, we import the product without and tell you.'),
    line('', ''),
    section('IMAGES'),
    line('Image URL', 'Paste a link to the photo. A Google Drive link is fine.'),
    line('  Important', 'In Drive: right-click the file → Share → General access → "Anyone with the link". Without this we cannot read the image and the product imports without a photo.'),
    line('  What happens', 'On import we copy the photo onto Trendit, so your listing keeps working even if you later move or delete the file.'),
    line('  Limits', 'JPG, PNG, WEBP, GIF or AVIF, up to 8MB each.'),
    line('', ''),
    section('ADDING AND UPDATING'),
    line('Adding products', 'Leave the ID blank on new rows and we create them.'),
    line('Updating products', 'Export your products, change what you need, and import the same file back. Keep the ID and Group columns as they are so we update instead of creating duplicates.'),
    line('Example rows', 'Rows whose Title starts with EXAMPLE are always skipped, so leaving them in does no harm.'),
    line('', ''),
    line('Before you import', 'Check: required columns filled, prices are numbers, rows of one product share a Group, and Drive links are shared with "Anyone with the link".'),
    line('Need help', 'Contact Trendit support and attach your sheet — we will take a look.'),
  ];

  helpLines.forEach(([label, text, isSection], index) => {
    const row = help.getRow(index + 2);
    if (isSection) {
      help.mergeCells(`A${index + 2}:B${index + 2}`);
      row.getCell(1).value = label;
      row.getCell(1).font = { bold: true, size: 11, color: { argb: BRAND_BLUE } };
      row.getCell(1).alignment = { vertical: 'middle', indent: 1 };
      row.height = 22;
    } else {
      row.getCell(1).value = label;
      row.getCell(1).font = { bold: true, size: 11, color: { argb: BRAND_DARK } };
      row.getCell(1).alignment = { vertical: 'top', indent: 1 };
      row.getCell(2).value = text;
      row.getCell(2).font = { size: 11, color: { argb: 'FF3A4252' } };
      row.getCell(2).alignment = { vertical: 'top', wrapText: true };
      if (text.length > 100) row.height = 30;
    }
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
