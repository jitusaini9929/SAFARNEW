# Mounting study planner routes

Planner routes are loaded dynamically from `server/index.ts`. If you need to wire them manually, use:

```ts
import planRouter from "./client/features/study-planner/plan.routes";

app.use("/api/plans", planRouter);
```

`plan.routes` already applies `requireAuth` internally.
