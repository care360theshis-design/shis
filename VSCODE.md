# Open SHIS in VS Code

The code is on GitHub: https://github.com/care360theshis-design/shis

1. Clone that repository.
2. In VS Code, choose File → Open Folder and select the cloned folder.
3. In the VS Code terminal, run `npm install`.
4. Start both parts. Either open Terminal → Run Task and run **SHIS website**, then **SHIS API**, or use two terminals:

```
npm run dev
npm run api
```

The website is http://localhost:8080. The API is http://localhost:3001.

Until `DATABASE_URL` in `.env` points at a database you control, the API keeps a local database in `data/`. Do not commit `.env` or `data/`.

Do not load real student medical records until that database is the school’s own, and a parent code opens only that child.
