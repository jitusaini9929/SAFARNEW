const fs = require('fs');

// 1. client/App.tsx
let appTsx = fs.readFileSync('client/App.tsx', 'utf8');
appTsx = appTsx.replace('const App = () => (', 'const App = () => {\n  useEffect(() => {\n    authService.initAuth();\n  }, []);\n\n  return (');
appTsx = appTsx.replace('</QueryClientProvider>\n);', '</QueryClientProvider>\n  );\n};');
fs.writeFileSync('client/App.tsx', appTsx);

// 2. server/routes/mehfil-socket.ts
let socketTs = fs.readFileSync('server/routes/mehfil-socket.ts', 'utf8');
socketTs = socketTs.replace(/options\?\.sessionMiddleware\?\.\(socket\.request as any, \{\} as any, next as any\);/,
  `const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthenticated'));
      try {
        const { verifyAccessToken } = require('../lib/jwt.service');
        const payload = verifyAccessToken(token);
        socket.data.userId = payload.sub;
        socket.data.isAdmin = payload.isAdmin;
        next();
      } catch {
        next(new Error('invalid_token'));
      }`);
socketTs = socketTs.replace(/const sessionUserId = String\(\(socket\.request as any\)\?\.session\?\.userId \|\| ''\)\.trim\(\);/g,
  "const sessionUserId = String(socket.data?.userId || '').trim();");
socketTs = socketTs.replace(/const bySession = String\(\(socket\.request as any\)\?\.session\?\.userId \|\| ''\)\.trim\(\);/g,
  "const bySession = String(socket.data?.userId || '').trim();");
fs.writeFileSync('server/routes/mehfil-socket.ts', socketTs);

// 3. client/lib/socket.ts
let libSocketTs = fs.readFileSync('client/lib/socket.ts', 'utf8');
libSocketTs = libSocketTs.replace(
  'import { io, Socket } from "socket.io-client";',
  'import { io, Socket } from "socket.io-client";\nimport { getAccessToken } from "../utils/apiFetch";'
);
libSocketTs = libSocketTs.replace(
  /path: "\/socket.io",/,
  'path: "/socket.io",\n    auth: { token: getAccessToken() },'
);
fs.writeFileSync('client/lib/socket.ts', libSocketTs);

console.log('Patch complete.');
