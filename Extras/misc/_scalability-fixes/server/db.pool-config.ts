// ═══════════════════════════════════════════════════════════════════════════
// SCALABILITY FIX #4 — DATABASE CONNECTION POOL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
//
// WHAT THIS FIXES:
//   Current pool max is 10 connections. With 5000 concurrent users making
//   DB queries, requests will queue and timeout waiting for a free connection.
//
// HOW TO ACTIVATE:
//   In server/db.ts, replace the Pool configuration block with this one.
//
// BEFORE (in server/db.ts lines ~17-28):
//   export const pool = new Pool({
//       connectionString,
//       ssl: connectionString?.includes('neon.tech') ? {
//           rejectUnauthorized: false
//       } : false,
//       max: 10,
//       idleTimeoutMillis: 30000,
//       connectionTimeoutMillis: 30000,
//       keepAlive: true,
//   });
//
// AFTER (replace with the block below):
// ═══════════════════════════════════════════════════════════════════════════

/*
export const pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('neon.tech') ? {
        rejectUnauthorized: false
    } : false,
    
    // ──── SCALABILITY: Tuned for 5000 concurrent users ────
    // Neon supports connection pooling via PgBouncer on their end.
    // Use the "pooled" connection string from Neon dashboard for best results.
    // Format: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db
    //
    // If using Neon's pooler (recommended):
    //   - Set max to 20-30 (Neon pooler handles fan-out on their side)
    //   - Use the "-pooler" hostname from Neon dashboard
    //
    // If NOT using Neon's pooler (direct connection):
    //   - Neon free tier allows max ~50 direct connections
    //   - Neon Pro allows configurable limits
    max: 25,
    
    // How long an idle connection stays in the pool before being closed
    idleTimeoutMillis: 30000,
    
    // How long to wait for a connection before timing out
    // Increased for cold starts but not too long to avoid hanging requests
    connectionTimeoutMillis: 15000,
    
    // Keep TCP connections alive to prevent Neon from closing idle connections
    keepAlive: true,
    
    // How often to send TCP keepalive packets (in ms)
    keepAliveInitialDelayMillis: 10000,
});
*/

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIONAL: NEON POOLER SETUP (Recommended for 5000+ users)
// ═══════════════════════════════════════════════════════════════════════════
//
// Neon provides a built-in PgBouncer connection pooler. Instead of your app
// managing 25 connections, Neon's pooler manages thousands of requests with
// far fewer actual DB connections.
//
// Steps:
//   1. Go to Neon Dashboard → Your Project → Connection Details
//   2. Toggle "Pooled connection" ON
//   3. Copy the pooled connection string (has "-pooler" in the hostname)
//   4. Set it as DATABASE_URL in your .env
//
// Example:
//   BEFORE: postgresql://user:pass@ep-cool-forest-123456.us-east-2.aws.neon.tech/neondb
//   AFTER:  postgresql://user:pass@ep-cool-forest-123456-pooler.us-east-2.aws.neon.tech/neondb
//
// That's it. No code changes needed — just swap the connection string.
// ═══════════════════════════════════════════════════════════════════════════
