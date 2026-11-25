import { getDb } from '../config/firebase.js';
import AppError from '../utils/appError.js';

/**
 * Normalizes a Firestore DocumentSnapshot into a plain object with `id`.
 * @param {FirebaseFirestore.DocumentSnapshot} doc
 */
function mapDoc(doc) {
  if (!doc || !doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * Fetches a single document by ID, throwing 404 when `required` is true.
 */
export async function findById(collectionName, id, { required = false, label = 'Resource' } = {}) {
  const doc = await getDb().collection(collectionName).doc(id).get();
  const item = mapDoc(doc);
  if (!item && required) {
    throw new AppError(`${label} not found`, 404);
  }
  return item;
}

/**
 * Finds the first document matching an equality filter.
 */
export async function findOneByField(collectionName, field, value) {
  const snapshot = await getDb()
    .collection(collectionName)
    .where(field, '==', value)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return mapDoc(snapshot.docs[0]);
}

/**
 * Finds all documents matching an array of `[field, operator, value]` filters.
 */
export async function findWhere(collectionName, filters = []) {
  let query = getDb().collection(collectionName);
  for (const [field, op, value] of filters) {
    if (value !== undefined && value !== null && value !== '') {
      query = query.where(field, op, value);
    }
  }
  const snapshot = await query.get();
  return snapshot.docs.map(mapDoc);
}

/**
 * Creates a document with automatic timestamps.
 */
export async function createDoc(collectionName, data, customId = undefined) {
  const now = new Date().toISOString();
  const payload = {
    ...data,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const colRef = getDb().collection(collectionName);
  if (customId) {
    await colRef.doc(customId).set(payload);
    return { id: customId, ...payload };
  }

  const docRef = await colRef.add(payload);
  return { id: docRef.id, ...payload };
}

/**
 * Updates an existing document by ID and refreshes `updatedAt`.
 */
export async function updateDocById(collectionName, id, updates, label = 'Resource') {
  const docRef = getDb().collection(collectionName).doc(id);
  const existing = await docRef.get();
  if (!existing.exists) {
    throw new AppError(`${label} not found`, 404);
  }

  const payload = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await docRef.update(payload);
  return { id, ...existing.data(), ...payload };
}

/**
 * Deletes a document by ID, throwing 404 if it does not exist.
 */
export async function deleteDocById(collectionName, id, label = 'Resource') {
  const docRef = getDb().collection(collectionName).doc(id);
  const existing = await docRef.get();
  if (!existing.exists) {
    throw new AppError(`${label} not found`, 404);
  }
  await docRef.delete();
  return { id, ...existing.data() };
}

/**
 * Filters, sorts, and paginates a list of documents in memory after Firestore equality filtering.
 * Avoids requiring dozens of composite Firestore indexes for arbitrary sort/search combinations.
 */
export function paginateAndSort(items, { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, searchFields = [] } = {}) {
  let result = [...items];

  if (search && searchFields.length > 0) {
    const q = search.toLowerCase().trim();
    result = result.filter((item) =>
      searchFields.some((field) => {
        const val = item[field];
        return typeof val === 'string' && val.toLowerCase().includes(q);
      })
    );
  }

  result.sort((a, b) => {
    const av = a[sortBy] ?? '';
    const bv = b[sortBy] ?? '';
    if (av < bv) return sortOrder === 'asc' ? -1 : 1;
    if (av > bv) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  const data = result.slice(start, start + safeLimit);

  return {
    data,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}
