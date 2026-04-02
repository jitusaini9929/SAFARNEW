/**
 * In-memory MongoDB stub for DEV_MODE.
 *
 * Provides the same API surface that server routes use (find, findOne,
 * insertOne, updateOne, deleteOne, countDocuments, aggregate, createIndex,
 * bulkWrite, distinct, etc.) but stores everything in plain JS Maps.
 *
 * Data is ephemeral — it resets every time the server restarts.
 * This is intentional: the dev server exists only to verify that the build
 * passes and the UI/API boots without errors.
 */

import { ObjectId } from 'mongodb';

// ── Helpers ──────────────────────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_key, value) =>
    value instanceof ObjectId ? value.toHexString() : value,
  ));
}

/** Naïve MongoDB query matcher — handles the operators route code actually uses. */
function matches(doc: any, query: any): boolean {
  if (!query || Object.keys(query).length === 0) return true;

  for (const key of Object.keys(query)) {
    // Top-level logical operators
    if (key === '$and') {
      if (!Array.isArray(query.$and)) return false;
      if (!query.$and.every((sub: any) => matches(doc, sub))) return false;
      continue;
    }
    if (key === '$or') {
      if (!Array.isArray(query.$or)) return false;
      if (!query.$or.some((sub: any) => matches(doc, sub))) return false;
      continue;
    }

    const value = query[key];
    const docVal = getNestedValue(doc, key);

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof ObjectId) && !(value instanceof Date)) {
      // Operator expression: { $gt, $gte, $lt, $lte, $ne, $in, $nin, $exists, $regex, $not }
      for (const op of Object.keys(value)) {
        switch (op) {
          case '$gt':  if (!(docVal > value.$gt)) return false; break;
          case '$gte': if (!(docVal >= value.$gte)) return false; break;
          case '$lt':  if (!(docVal < value.$lt)) return false; break;
          case '$lte': if (!(docVal <= value.$lte)) return false; break;
          case '$ne':  if (docVal === value.$ne) return false; break;
          case '$in':  if (!Array.isArray(value.$in) || !value.$in.includes(docVal)) return false; break;
          case '$nin': if (Array.isArray(value.$nin) && value.$nin.includes(docVal)) return false; break;
          case '$exists':
            if (value.$exists && docVal === undefined) return false;
            if (!value.$exists && docVal !== undefined) return false;
            break;
          case '$regex': {
            const flags = value.$options || '';
            const re = value.$regex instanceof RegExp ? value.$regex : new RegExp(value.$regex, flags);
            if (!re.test(String(docVal ?? ''))) return false;
            break;
          }
          case '$not':
            if (matches(doc, { [key]: value.$not })) return false;
            break;
          default:
            // Unknown operator — treat as literal comparison
            if (docVal !== value) return false;
        }
      }
    } else {
      // Literal equality
      if (String(docVal) !== String(value)) return false;
    }
  }
  return true;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function applyProjection(doc: any, projection: any): any {
  if (!projection || Object.keys(projection).length === 0) return doc;

  const result: any = {};
  const isInclusion = Object.values(projection).some((v) => v === 1 || v === true);

  if (isInclusion) {
    // Always include _id unless explicitly excluded
    if (projection._id !== 0 && projection._id !== false) {
      result._id = doc._id;
    }
    for (const key of Object.keys(projection)) {
      if (key === '_id') continue;
      if (projection[key] === 1 || projection[key] === true) {
        result[key] = doc[key];
      }
    }
  } else {
    // Exclusion mode
    Object.assign(result, doc);
    for (const key of Object.keys(projection)) {
      if (projection[key] === 0 || projection[key] === false) {
        delete result[key];
      }
    }
  }
  return result;
}

function applyUpdate(doc: any, update: any): any {
  const clone = { ...doc };

  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      setNestedValue(clone, k, v);
    }
  }
  if (update.$unset) {
    for (const k of Object.keys(update.$unset)) {
      delete clone[k];
    }
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      const cur = getNestedValue(clone, k) || 0;
      setNestedValue(clone, k, cur + (v as number));
    }
  }
  if (update.$push) {
    for (const [k, v] of Object.entries(update.$push)) {
      const arr = getNestedValue(clone, k) || [];
      arr.push(v);
      setNestedValue(clone, k, arr);
    }
  }
  if (update.$pull) {
    for (const [k, v] of Object.entries(update.$pull)) {
      const arr = getNestedValue(clone, k);
      if (Array.isArray(arr)) {
        setNestedValue(clone, k, arr.filter((item: any) => item !== v));
      }
    }
  }
  if (update.$addToSet) {
    for (const [k, v] of Object.entries(update.$addToSet)) {
      const arr = getNestedValue(clone, k) || [];
      if (!arr.includes(v)) arr.push(v);
      setNestedValue(clone, k, arr);
    }
  }
  if (update.$min) {
    for (const [k, v] of Object.entries(update.$min)) {
      const cur = getNestedValue(clone, k);
      if (cur === undefined || (v as number) < cur) setNestedValue(clone, k, v);
    }
  }
  if (update.$max) {
    for (const [k, v] of Object.entries(update.$max)) {
      const cur = getNestedValue(clone, k);
      if (cur === undefined || (v as number) > cur) setNestedValue(clone, k, v);
    }
  }

  // If the update has no operators, treat it as a full replacement (excluding _id)
  const hasOperators = Object.keys(update).some((k) => k.startsWith('$'));
  if (!hasOperators) {
    const _id = clone._id;
    Object.keys(clone).forEach((k) => delete clone[k]);
    Object.assign(clone, update);
    clone._id = _id;
  }

  return clone;
}

function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let target = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (target[parts[i]] === undefined) target[parts[i]] = {};
    target = target[parts[i]];
  }
  target[parts[parts.length - 1]] = value;
}

// ── In-Memory Cursor ─────────────────────────────────────────────────────────

class MemoryCursor {
  private docs: any[];
  private _sort: any = null;
  private _skip = 0;
  private _limit = 0;
  private _projection: any = null;

  constructor(docs: any[]) {
    this.docs = docs;
  }

  sort(spec: any): MemoryCursor {
    this._sort = spec;
    return this;
  }

  skip(n: number): MemoryCursor {
    this._skip = n;
    return this;
  }

  limit(n: number): MemoryCursor {
    this._limit = n;
    return this;
  }

  project(spec: any): MemoryCursor {
    this._projection = spec;
    return this;
  }

  maxTimeMS(_ms: number): MemoryCursor {
    // no-op in memory
    return this;
  }

  async toArray(): Promise<any[]> {
    let result = [...this.docs];

    if (this._sort) {
      const sortKeys = Object.keys(this._sort);
      result.sort((a, b) => {
        for (const key of sortKeys) {
          const dir = this._sort[key] === -1 ? -1 : 1;
          const aVal = getNestedValue(a, key);
          const bVal = getNestedValue(b, key);
          if (aVal < bVal) return -1 * dir;
          if (aVal > bVal) return 1 * dir;
        }
        return 0;
      });
    }

    if (this._skip > 0) result = result.slice(this._skip);
    if (this._limit > 0) result = result.slice(0, this._limit);

    if (this._projection) {
      result = result.map((d) => applyProjection(d, this._projection));
    }

    return deepClone(result);
  }

  /** Async iterator support for `for await (const doc of cursor)` */
  async *[Symbol.asyncIterator]() {
    const arr = await this.toArray();
    for (const doc of arr) {
      yield doc;
    }
  }
}

// ── In-Memory Collection ─────────────────────────────────────────────────────

class MemoryCollection {
  private name: string;
  private docs: Map<string, any> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  // ── Reads ──

  find(query?: any, options?: any): MemoryCursor {
    const all = Array.from(this.docs.values());
    const matched = query ? all.filter((d) => matches(d, query)) : all;
    const cursor = new MemoryCursor(matched);
    if (options?.projection) cursor.project(options.projection);
    if (options?.sort) cursor.sort(options.sort);
    if (options?.limit) cursor.limit(options.limit);
    if (options?.skip) cursor.skip(options.skip);
    return cursor;
  }

  async findOne(query?: any, options?: any): Promise<any> {
    const all = Array.from(this.docs.values());
    const doc = all.find((d) => matches(d, query || {}));
    if (!doc) return null;
    const result = deepClone(doc);
    if (options?.projection) return applyProjection(result, options.projection);
    return result;
  }

  async countDocuments(query?: any): Promise<number> {
    if (!query || Object.keys(query).length === 0) return this.docs.size;
    return Array.from(this.docs.values()).filter((d) => matches(d, query)).length;
  }

  async estimatedDocumentCount(): Promise<number> {
    return this.docs.size;
  }

  async distinct(field: string, query?: any): Promise<any[]> {
    let docs = Array.from(this.docs.values());
    if (query) docs = docs.filter((d) => matches(d, query));
    const set = new Set(docs.map((d) => getNestedValue(d, field)).filter((v) => v !== undefined));
    return Array.from(set);
  }

  // ── Writes ──

  async insertOne(doc: any): Promise<any> {
    const clone = deepClone(doc);
    if (!clone._id) clone._id = new ObjectId().toHexString();
    const key = clone._id?.toString() || clone.id?.toString() || Math.random().toString(36);
    this.docs.set(key, clone);
    return { acknowledged: true, insertedId: clone._id };
  }

  async insertMany(docs: any[]): Promise<any> {
    const ids: any[] = [];
    for (const doc of docs) {
      const result = await this.insertOne(doc);
      ids.push(result.insertedId);
    }
    return { acknowledged: true, insertedCount: ids.length, insertedIds: ids };
  }

  async updateOne(query: any, update: any, options?: any): Promise<any> {
    const all = Array.from(this.docs.entries());
    const entry = all.find(([, d]) => matches(d, query));

    if (entry) {
      const [key, doc] = entry;
      const updated = applyUpdate(doc, update);
      this.docs.set(key, updated);
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedId: null };
    }

    if (options?.upsert) {
      const newDoc = { ...query, ...(update.$set || {}), ...(update.$setOnInsert || {}) };
      if (!newDoc._id) newDoc._id = new ObjectId().toHexString();
      const key = newDoc._id.toString();
      this.docs.set(key, newDoc);
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: newDoc._id };
    }

    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: null };
  }

  async updateMany(query: any, update: any): Promise<any> {
    const all = Array.from(this.docs.entries());
    let modified = 0;
    for (const [key, doc] of all) {
      if (matches(doc, query)) {
        this.docs.set(key, applyUpdate(doc, update));
        modified++;
      }
    }
    return { acknowledged: true, matchedCount: modified, modifiedCount: modified };
  }

  async deleteOne(query: any): Promise<any> {
    const all = Array.from(this.docs.entries());
    const entry = all.find(([, d]) => matches(d, query));
    if (entry) {
      this.docs.delete(entry[0]);
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async deleteMany(query: any): Promise<any> {
    const all = Array.from(this.docs.entries());
    let deleted = 0;
    for (const [key, doc] of all) {
      if (matches(doc, query || {})) {
        this.docs.delete(key);
        deleted++;
      }
    }
    return { acknowledged: true, deletedCount: deleted };
  }

  async findOneAndUpdate(query: any, update: any, options?: any): Promise<any> {
    const before = await this.findOne(query);
    await this.updateOne(query, update, options);
    if (options?.returnDocument === 'after') {
      return { value: await this.findOne(query) };
    }
    return { value: before };
  }

  async findOneAndDelete(query: any): Promise<any> {
    const doc = await this.findOne(query);
    if (doc) await this.deleteOne(query);
    return { value: doc };
  }

  async replaceOne(query: any, replacement: any, options?: any): Promise<any> {
    const all = Array.from(this.docs.entries());
    const entry = all.find(([, d]) => matches(d, query));
    if (entry) {
      const [key] = entry;
      replacement._id = entry[1]._id;
      this.docs.set(key, deepClone(replacement));
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    }
    if (options?.upsert) {
      return this.insertOne(replacement);
    }
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
  }

  // ── Indexes (no-op) ──

  async createIndex(_spec: any, _options?: any): Promise<string> {
    return 'ok_memory';
  }

  async createIndexes(_specs: any[]): Promise<any> {
    return { ok: 1 };
  }

  async dropIndex(_name: string): Promise<any> {
    return { ok: 1 };
  }

  async listIndexes(): Promise<any> {
    return { toArray: async () => [] };
  }

  // ── Aggregation (minimal stub) ──

  aggregate(pipeline: any[]): MemoryCursor {
    let docs = Array.from(this.docs.values());

    for (const stage of pipeline) {
      if (stage.$match) {
        docs = docs.filter((d) => matches(d, stage.$match));
      } else if (stage.$sort) {
        const sortKeys = Object.keys(stage.$sort);
        docs.sort((a, b) => {
          for (const key of sortKeys) {
            const dir = stage.$sort[key] === -1 ? -1 : 1;
            const aVal = getNestedValue(a, key);
            const bVal = getNestedValue(b, key);
            if (aVal < bVal) return -1 * dir;
            if (aVal > bVal) return 1 * dir;
          }
          return 0;
        });
      } else if (stage.$limit) {
        docs = docs.slice(0, stage.$limit);
      } else if (stage.$skip) {
        docs = docs.slice(stage.$skip);
      } else if (stage.$project) {
        docs = docs.map((d) => applyProjection(d, stage.$project));
      } else if (stage.$group) {
        // Minimal $group: aggregate into a single result with $sum
        const grouped: any = {};
        const groupId = stage.$group._id;

        for (const doc of docs) {
          const gKey = groupId ? JSON.stringify(getNestedValue(doc, groupId.replace('$', ''))) : '__all__';
          if (!grouped[gKey]) {
            grouped[gKey] = { _id: groupId ? getNestedValue(doc, groupId.replace('$', '')) : null };
          }
          for (const [field, expr] of Object.entries(stage.$group)) {
            if (field === '_id') continue;
            const op = expr as any;
            if (op.$sum !== undefined) {
              const val = typeof op.$sum === 'number' ? op.$sum : (getNestedValue(doc, (op.$sum as string).replace('$', '')) || 0);
              grouped[gKey][field] = (grouped[gKey][field] || 0) + val;
            } else if (op.$first !== undefined) {
              if (grouped[gKey][field] === undefined) {
                grouped[gKey][field] = typeof op.$first === 'string' && op.$first.startsWith('$')
                  ? getNestedValue(doc, op.$first.replace('$', ''))
                  : op.$first;
              }
            } else if (op.$last !== undefined) {
              grouped[gKey][field] = typeof op.$last === 'string' && op.$last.startsWith('$')
                ? getNestedValue(doc, op.$last.replace('$', ''))
                : op.$last;
            } else if (op.$max !== undefined) {
              const val = typeof op.$max === 'string' && op.$max.startsWith('$')
                ? getNestedValue(doc, op.$max.replace('$', ''))
                : op.$max;
              if (grouped[gKey][field] === undefined || val > grouped[gKey][field]) {
                grouped[gKey][field] = val;
              }
            } else if (op.$min !== undefined) {
              const val = typeof op.$min === 'string' && op.$min.startsWith('$')
                ? getNestedValue(doc, op.$min.replace('$', ''))
                : op.$min;
              if (grouped[gKey][field] === undefined || val < grouped[gKey][field]) {
                grouped[gKey][field] = val;
              }
            }
          }
        }
        docs = Object.values(grouped);
      } else if (stage.$unwind) {
        // Simple $unwind support
        const fieldPath = typeof stage.$unwind === 'string' ? stage.$unwind : stage.$unwind.path;
        const field = fieldPath.replace('$', '');
        const unwound: any[] = [];
        for (const doc of docs) {
          const arr = getNestedValue(doc, field);
          if (Array.isArray(arr) && arr.length > 0) {
            for (const item of arr) {
              const clone = { ...doc };
              setNestedValue(clone, field, item);
              unwound.push(clone);
            }
          } else if (stage.$unwind?.preserveNullAndEmptyArrays) {
            unwound.push(doc);
          }
        }
        docs = unwound;
      }
      // Other stages ($lookup, $addFields, etc.) are silently skipped.
      // This is fine — dev mode will return approximate results.
    }

    return new MemoryCursor(docs);
  }

  // ── Bulk ──

  async bulkWrite(operations: any[]): Promise<any> {
    let insertedCount = 0;
    let modifiedCount = 0;
    let deletedCount = 0;

    for (const op of operations) {
      if (op.insertOne) {
        await this.insertOne(op.insertOne.document || op.insertOne);
        insertedCount++;
      } else if (op.updateOne) {
        const r = await this.updateOne(op.updateOne.filter, op.updateOne.update, op.updateOne);
        modifiedCount += r.modifiedCount;
      } else if (op.updateMany) {
        const r = await this.updateMany(op.updateMany.filter, op.updateMany.update);
        modifiedCount += r.modifiedCount;
      } else if (op.deleteOne) {
        const r = await this.deleteOne(op.deleteOne.filter);
        deletedCount += r.deletedCount;
      } else if (op.deleteMany) {
        const r = await this.deleteMany(op.deleteMany.filter);
        deletedCount += r.deletedCount;
      } else if (op.replaceOne) {
        await this.replaceOne(op.replaceOne.filter, op.replaceOne.replacement, op.replaceOne);
        modifiedCount++;
      }
    }

    return { ok: 1, insertedCount, modifiedCount, deletedCount };
  }
}

// ── In-Memory Database ───────────────────────────────────────────────────────

const collectionStore: Map<string, MemoryCollection> = new Map();

export class MemoryDb {
  collection(name: string): MemoryCollection {
    if (!collectionStore.has(name)) {
      collectionStore.set(name, new MemoryCollection(name));
    }
    return collectionStore.get(name)!;
  }

  async command(cmd: any): Promise<any> {
    // Handles `{ ping: 1 }` and similar admin commands
    return { ok: 1 };
  }

  async listCollections(): Promise<any> {
    return {
      toArray: async () =>
        Array.from(collectionStore.keys()).map((name) => ({ name, type: 'collection' })),
    };
  }
}

/**
 * Creates a singleton in-memory database instance.
 * Called by `db.ts` when `DEV_MODE=true`.
 */
export function createInMemoryDb(): MemoryDb {
  return new MemoryDb();
}
