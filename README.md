# Wex

ASP.NET Core backend with a React (Vite + TypeScript) frontend.

## Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download) 11+
- [Node.js](https://nodejs.org/) 20+

## Development

Install frontend dependencies once:

```bash
cd client
npm install
```

Run the full stack (starts Vite and the API; opens the site in your browser):

```bash
dotnet run --project server
```

The API is available at `http://localhost:5118`. In development, the ASP.NET app proxies the UI to the Vite dev server on port 5173.

### Database

Transactions are stored in **SQLite** (`server/wex.db`, created on first run). After changing the model:

```bash
cd server
dotnet ef migrations add <MigrationName>
```

Install the EF CLI once if needed: `dotnet tool install --global dotnet-ef`

To run frontend and backend separately:

```bash
# Terminal 1
dotnet run --project server

# Terminal 2
cd client
npm run dev
```

Then open `http://localhost:5173` (Vite proxies `/api` to the backend).

## Production build

```bash
cd client
npm ci
npm run build
dotnet publish server -c Release
```

The React app is emitted to `server/wwwroot` and served as static files by ASP.NET Core.

## Tests

Run backend tests (unit + API integration with an in-memory database and mocked Treasury API):

```bash
dotnet test server.tests/Wex.Server.Tests.csproj
```

Run frontend tests (Vitest + React Testing Library):

```bash
cd client
npm test
```

Or run everything from the solution:

```bash
dotnet test Wex.sln
cd client && npm test
```
