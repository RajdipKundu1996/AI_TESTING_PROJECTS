const xlsx = require('xlsx');
const path = require('path');

const file1 = 'c:\\Users\\23483\\Downloads\\Emudhra-Test-Audit-Report-2.xlsx';
const file2 = 'c:\\Users\\23483\\Downloads\\Integration_Test_Cases.xlsx';

function readExcel(filePath) {
    console.log(`\n--- READING: ${path.basename(filePath)} ---`);
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Print first 5 rows to understand structure and content
        data.slice(0, 10).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
    }
}

readExcel(file1);
readExcel(file2);
