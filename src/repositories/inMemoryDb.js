import crypto from 'node:crypto';

/**
 * Lightweight Firestore-compatible in-memory database used solely for automated tests.
 */
export function createInMemoryFirestore() {
  const collections = new Map();

  function getCollectionMap(name) {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    return collections.get(name);
  }

  function makeSnapshot(id, data) {
    return {
      id,
      exists: data !== undefined,
      data: () => (data === undefined ? undefined : structuredClone(data)),
    };
  }

  function applyFilters(entries, filters) {
    return entries.filter(([, data]) =>
      filters.every(([field, op, value]) => {
        const actual = data[field];
        switch (op) {
          case '==':
            return actual === value;
          case '!=':
            return actual !== value;
          case '>':
            return actual > value;
          case '>=':
            return actual >= value;
          case '<':
            return actual < value;
          case '<=':
            return actual <= value;
          case 'in':
            return Array.isArray(value) && value.includes(actual);
          case 'array-contains':
            return Array.isArray(actual) && actual.includes(value);
          default:
            return false;
        }
      })
    );
  }

  function createQuery(collectionName, state = { filters: [], orderBys: [], limitCount: null }) {
    return {
      where(field, op, value) {
        return createQuery(collectionName, {
          ...state,
          filters: [...state.filters, [field, op, value]],
        });
      },
      orderBy(field, direction = 'asc') {
        return createQuery(collectionName, {
          ...state,
          orderBys: [...state.orderBys, [field, direction]],
        });
      },
      limit(count) {
        return createQuery(collectionName, {
          ...state,
          limitCount: count,
        });
      },
      async get() {
        const colMap = getCollectionMap(collectionName);
        let entries = applyFilters([...colMap.entries()], state.filters);

        if (state.orderBys.length > 0) {
          entries.sort(([, a], [, b]) => {
            for (const [field, dir] of state.orderBys) {
              if (a[field] < b[field]) return dir === 'desc' ? 1 : -1;
              if (a[field] > b[field]) return dir === 'desc' ? -1 : 1;
            }
            return 0;
          });
        }

        if (typeof state.limitCount === 'number') {
          entries = entries.slice(0, state.limitCount);
        }

        const docs = entries.map(([id, data]) => makeSnapshot(id, data));
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
        };
      },
    };
  }

  return {
    settings() {},
    clear() {
      collections.clear();
    },
    collection(name) {
      const colMap = getCollectionMap(name);
      const baseQuery = createQuery(name);

      return {
        ...baseQuery,
        doc(id) {
          const docId = id || crypto.randomUUID().replace(/-/g, '').slice(0, 20);
          return {
            id: docId,
            async get() {
              return makeSnapshot(docId, colMap.get(docId));
            },
            async set(data, options = {}) {
              if (options.merge && colMap.has(docId)) {
                colMap.set(docId, {
                  ...colMap.get(docId),
                  ...structuredClone(data),
                });
              } else {
                colMap.set(docId, structuredClone(data));
              }
            },
            async update(data) {
              if (!colMap.has(docId)) {
                throw new Error(`Document ${name}/${docId} does not exist`);
              }
              colMap.set(docId, {
                ...colMap.get(docId),
                ...structuredClone(data),
              });
            },
            async delete() {
              colMap.delete(docId);
            },
          };
        },
        async add(data) {
          const docId = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
          colMap.set(docId, structuredClone(data));
          return { id: docId };
        },
      };
    },
  };
}
