Dev start

1. Ensure you have Node installed and Mongo connection configured in `.env` (MONGO_URL).
2. Double-click `start-dev.bat` to open two windows:
   - one running `node server.js` (server logs)
   - another running `test-admin.ps1 -CreateTestUser` which will create/delete a test user

Manual steps:
- Start server: `node server.js`
- Run tests: `powershell -NoProfile -ExecutionPolicy Bypass -File .\test-admin.ps1 -CreateTestUser`
