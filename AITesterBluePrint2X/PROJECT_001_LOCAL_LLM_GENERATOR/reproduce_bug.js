
const testCases = `Summary: Case 1
Description: Desc 1
Preconditions: Pre 1
Steps to Reproduce: Step 1
Expected Result: Exp 1
Priority: High
Labels: label1

Summary: Case 2
Description: Desc 2
Preconditions: Pre 2
Steps to Reproduce: Step 2
Expected Result: Exp 2
Priority: Medium
Labels: label2`;

const cases = testCases.split(/(?=Summary:|\*\*Summary:)/i);

const getValue = (tc, key) => {
    const regex = new RegExp(`(?:\\*\\*)?${key}(?:\\*\\*)?:?\\s*([\\s\\S]*?)(?=\\n(?:\\*\\*)?[\\w\\s]+(?:\\*\\*)?:|$)`, 'i');
    const match = tc.match(regex);
    return (match && match[1]) ? match[1].trim() : '';
};

cases.forEach((tc, i) => {
    console.log(`Case ${i}:`);
    console.log(`  Summary: "${getValue(tc, 'Summary')}"`);
    console.log(`  Description: "${getValue(tc, 'Description')}"`);
    console.log(`  Priority: "${getValue(tc, 'Priority')}"`);
});

const testCasesMarkdown = `**Summary**: Case Markdown
**Description**: Desc Markdown
**Preconditions**: Pre Markdown
**Steps to Reproduce**: Step Markdown
**Expected Result**: Exp Markdown
**Priority**: High
**Labels**: label1`;

console.log('\nTesting Markdown format:');
const casesMD = testCasesMarkdown.split(/(?=Summary:|\*\*Summary:)/i);
casesMD.forEach((tc, i) => {
    console.log(`Case ${i}:`);
    console.log(`  Summary: "${getValue(tc, 'Summary')}"`);
    console.log(`  Description: "${getValue(tc, 'Description')}"`);
});

const testCasesBullet = `- **Summary**: Case Bullet
- **Description**: Desc Bullet`;

console.log('\nTesting Bullet format:');
const casesBullet = testCasesBullet.split(/(?=Summary:|\*\*Summary:)/i);
casesBullet.forEach((tc, i) => {
    console.log(`Case ${i}:`);
    console.log(`  Summary: "${getValue(tc, 'Summary')}"`);
    console.log(`  Description: "${getValue(tc, 'Description')}"`);
});
