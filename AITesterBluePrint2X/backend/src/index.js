import express, {} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });
// Helper: Parse text from various files
async function parseFileContent(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }
    else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        const workbook = xlsx.readFile(filePath);
        let text = '';
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            if (sheet) {
                text += xlsx.utils.sheet_to_txt(sheet) + '\n';
            }
        });
        return text;
    }
    return '';
}
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Test Buddy Backend is alive' });
});
app.post('/api/generate', upload.single('file'), async (req, res) => {
    const { provider, config, prompt } = req.body;
    const file = req.file;
    const { baseUrl, apiKey, defaultModel } = typeof config === 'string' ? JSON.parse(config) : (typeof config === 'object' && config !== null ? config : {});
    let finalPrompt = prompt || '';
    // If file is uploaded, parse it
    if (file) {
        try {
            const fileContent = await parseFileContent(file.path, file.originalname);
            if (fileContent) {
                finalPrompt = `Requirement from file (${file.originalname}):\n${fileContent}\n\nAdditional context: ${finalPrompt}`;
            }
            // Cleanup file after parsing
            fs.unlinkSync(file.path);
        }
        catch (err) {
            console.error('File parsing error:', err);
        }
    }
    if (!finalPrompt.trim()) {
        res.status(400).json({ status: 'error', message: 'No requirement text or file provided' });
        return;
    }
    // Robust URL normalizer — validates before using, falls back to default if bad
    const normalizeUrl = (raw, fallback) => {
        if (!raw || typeof raw !== 'string' || raw.trim() === '')
            return fallback;
        let url = raw.trim().replace(/\s/g, ''); // Remove all spaces
        if (!url.startsWith('http://') && !url.startsWith('https://'))
            url = `http://${url}`;
        try {
            new URL(url); // validate — throws if malformed
            return url.endsWith('/') ? url.slice(0, -1) : url;
        }
        catch {
            console.warn(`[URL] Invalid URL provided: "${raw}", using fallback: ${fallback}`);
            return fallback;
        }
    };
    const systemPrompt = `You are an expert QA Engineer. Generate comprehensive Jira Test Cases based on the following requirement.
Format the output clearly and professionally with:
- Summary
- Description
- Preconditions
- Steps to Reproduce
- Expected Result
- Priority
- Labels`;
    try {
        let generatedText = '';
        console.log(`[Generate] Provider: ${provider}, Model: ${defaultModel || '(default)'}`);
        if (provider === 'ollama') {
            const cleanUrl = normalizeUrl(baseUrl, 'http://127.0.0.1:11434/api');
            const modelName = (defaultModel || 'gemma3:1b').replace('.', ':'); // common user mistake: gemma3.1b -> gemma3:1b
            console.log(`[Ollama] Requesting: ${cleanUrl}/generate with model: ${modelName}`);
            const response = await axios.post(`${cleanUrl}/generate`, {
                model: modelName,
                prompt: `${systemPrompt}\n\nRequirement:\n${finalPrompt}`,
                stream: false
            });
            console.log(`[Ollama] Success: Received response`);
            generatedText = response.data.response;
        }
        else if (provider === 'openai' || provider === 'lmstudio' || provider === 'grok') {
            const safeBaseUrl = normalizeUrl(baseUrl, '');
            let url = 'https://api.openai.com/v1';
            if (provider === 'lmstudio') {
                url = safeBaseUrl || 'http://127.0.0.1:1234/v1';
            }
            else if (provider === 'grok') {
                url = safeBaseUrl || 'https://api.x.ai/v1';
            }
            else if (safeBaseUrl) {
                url = safeBaseUrl;
            }
            const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            const response = await axios.post(`${cleanUrl}/chat/completions`, {
                model: defaultModel || (provider === 'grok' ? 'grok-beta' : 'gpt-4o'),
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: finalPrompt }
                ]
            }, {
                headers: { 'Authorization': `Bearer ${apiKey || 'no-key-provided'}` }
            });
            generatedText = response.data.choices[0].message.content;
        }
        else if (provider === 'gemini') {
            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${defaultModel || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`, {
                contents: [
                    { parts: [{ text: `${systemPrompt}\n\nRequirement:\n${finalPrompt}` }] }
                ]
            });
            generatedText = response.data.candidates[0].content.parts[0].text;
        }
        else if (provider === 'claude') {
            const response = await axios.post('https://api.anthropic.com/v1/messages', {
                model: defaultModel || 'claude-3-5-sonnet-20240620',
                max_tokens: 3000,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: finalPrompt }
                ]
            }, {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                }
            });
            generatedText = response.data.content[0].text;
        }
        else {
            throw new Error(`Provider ${provider} not fully integrated yet.`);
        }
        res.json({ status: 'success', data: generatedText });
    }
    catch (error) {
        const err = error;
        const errorMsg = err?.response?.data?.error?.message || err?.message || 'Unknown error occurred';
        console.error(`LLM API Error [${provider}]:`, errorMsg);
        res.status(500).json({
            status: 'error',
            message: errorMsg,
            details: err?.response?.data
        });
    }
});
app.post('/api/export-xlsx', async (req, res) => {
    const { testCases } = req.body;
    if (!testCases) {
        res.status(400).json({ error: 'No test cases provided' });
        return;
    }
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Jira Test Cases');
        worksheet.columns = [
            { header: 'Summary', key: 'summary', width: 40 },
            { header: 'Description', key: 'description', width: 50 },
            { header: 'Preconditions', key: 'preconditions', width: 40 },
            { header: 'Steps to Reproduce', key: 'steps', width: 60 },
            { header: 'Expected Result', key: 'expected', width: 50 },
            { header: 'Priority', key: 'priority', width: 15 },
            { header: 'Labels', key: 'labels', width: 20 }
        ];
        // Simple parsing logic — assumes LLM follows the requested format
        // In a production app, we might use a more robust regex or structured LLM output
        const cases = testCases.split(/(?=\n(?:-?\s*)?(?:\*\*|Summary:|\*\*Summary:))/i).filter((c) => c.trim().length > 20);
        cases.forEach((tc) => {
            const getValue = (key) => {
                // Robust regex for Markdown/Plaintext fields:
                // Handles:
                // 1. Optional bullet points: - Summary
                // 2. Markdown bolding: **Summary**
                // 3. Optional colon: Summary:
                // 4. Case insensitivity
                const regex = new RegExp(`(?:-?\\s*)?(?:\\*\\*)?${key}(?:\\*\\*)?:?\\s*([\\s\\S]*?)(?=\\n(?:-?\\s*)?(?:\\*\\*)?[\\w\\s]+(?:\\*\\*)?:|$)`, 'i');
                const match = tc.match(regex);
                return (match && match[1]) ? match[1].trim() : '';
            };
            const summary = getValue('Summary');
            if (!summary)
                return;
            worksheet.addRow({
                summary,
                description: getValue('Description'),
                preconditions: getValue('Preconditions'),
                steps: getValue('Steps to Reproduce'),
                expected: getValue('Expected Result'),
                priority: getValue('Priority'),
                labels: getValue('Labels')
            });
        });
        // Formatting
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Jira_Test_Cases.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to generate Excel file' });
    }
});
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
server.on('error', (err) => {
    console.error('Server failed to start or encountered an error:', err);
});
// Keep process alive if it's exiting prematurely
setInterval(() => { }, 1000000);
//# sourceMappingURL=index.js.map