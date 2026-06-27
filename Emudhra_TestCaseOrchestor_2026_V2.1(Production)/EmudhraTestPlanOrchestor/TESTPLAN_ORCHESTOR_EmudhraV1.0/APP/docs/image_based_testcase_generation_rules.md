# Image Based Test Case Generation Rules

Use this procedure whenever test cases are generated from screenshots, visible URL/API evidence, Test Steps / Navigation, Acceptance Criteria, and Expected Result.

## Required Procedure

1. Generate test cases from the Acceptance Criteria and screenshot evidence only.
2. Do not invent test data.
3. Use only values explicitly listed in Acceptance Criteria.
4. Generate separate functional UI test cases for each listed Acceptance Criteria value.
5. Generate separate database test cases for database table, storage, and encryption validation.
6. Do not mix database validation steps into functional UI test cases.
7. Derive Module Name only from visible URL or API endpoint evidence.
8. Put visible URL/API availability and setup points in Preconditions as numbered points.
9. Keep final Acceptance Criteria expected-result verification in Test Scenario, not in Test Steps.
10. In Test Steps, follow the user-provided navigation/actions and preserve UI actions such as Click Login.
11. Add database rows as TC-DB-* cases only.
12. Database rows must validate whether submitted data is stored in the mapped table and whether sensitive data is encrypted, hashed, tokenized, or masked according to policy.

## Sheet Columns

Use the saved Image Based test-case sheet columns:

- TC ID
- Module Name
- Test Scenario
- Preconditions
- Test Steps
- Test Data
- Expected Result
- Database Table
- Database Validation
- Encryption / Storage Format Check
- Actual Result
- Status
- Tester's Name
- Testing Date
- Build Version
- Reviewed By
- Review Date
- Comments

## Important

Do not replace the user's Acceptance Criteria values with assumed examples. If a required detail is not visible or not provided, keep the generated text generic, such as "mapped database table", instead of inventing a table name.
