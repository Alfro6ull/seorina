import { createStudies } from './demo.js';

const MODULE_BASE = new URL('./', import.meta.url);
const STORE = 'photos';
const ALLOWED_IMAGE = /\.(jpe?g|png|webp|avif|gif|bmp)$/i;
const LOCAL_IMAGE = /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i;
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_INPUT_PIXELS = 90_000_000;
const wrap = (value, length) => ((value % length) + length) % length;
const error = (code, message, cause) => Object.assign(new Error(message), { code, cause });

function sourceURL(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function imageURL(value, base) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    return url.origin === base.origin && !url.username && !url.password && ALLOWED_IMAGE.test(url.pathname) ? url.href : null;
  } catch { return null; }
}

function loadImage(src, signal) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      image.onload = image.onerror = null;
      signal?.removeEventListener('abort', abort);
    };
    const fail = failure => { cleanup(); image.src = ''; reject(failure); };
    const abort = () => fail(error('cancelled', '已取消载入。'));
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) return fail(error('decode_failed', '照片无法解码。'));
      cleanup();
      resolve(image);
    };
    image.onerror = () => fail(error('decode_failed', '照片无法解码，可能是格式不受支持或文件已损坏。'));
    timer = setTimeout(() => fail(error('image_timeout', '照片载入超时。')), 20000);
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true });
    image.src = src;
  });
}

function fittedCanvas(image, maxDimension) {
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(originalWidth * scale));
  canvas.height = Math.max(1, Math.round(originalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw error('canvas_unavailable', '当前浏览器无法处理这张照片。');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(error('encode_failed', '照片处理失败。')), 'image/webp', .88);
    } catch (cause) { reject(error('encode_failed', '照片处理失败。', cause)); }
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || Error('Storage request failed'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error || Error('Storage transaction aborted'));
    transaction.onerror = () => { /* onabort is the terminal failure event. */ };
  });
}

async function mapLimited(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      try { results[index] = { status: 'fulfilled', value: await mapper(values[index], index) }; }
      catch (reason) { results[index] = { status: 'rejected', reason }; }
    }
  }));
  return results;
}

/** One collection and local import store shared by the entry and all scene routes. */
export class Gallery extends EventTarget {
  constructor({ catalogURL = new URL('library.json', MODULE_BASE), maxItems = 48, maxDimension = 1600 } = {}) {
    super();
    this.catalogURL = new URL(catalogURL, MODULE_BASE);
    this.base = new URL('./', this.catalogURL);
    this.maxItems = Math.min(80, Math.max(1, Math.floor(Number(maxItems) || 48)));
    this.maxDimension = Math.min(2000, Math.max(512, Math.floor(Number(maxDimension) || 1600)));
    this.items = [];
    this.index = 0;
    this.status = { phase: 'idle', code: 'idle', message: '', persistent: true };
    this._catalog = [];
    this._catalogEntries = [];
    this._local = [];
    this._studies = null;
    this._db = null;
    this._dbPromise = null;
    this._storageError = null;
    this._manifestError = null;
    this._queue = Promise.resolve();
    this._abort = new AbortController();
    this._selectionKey = `muse:selection:${this.base.pathname}`;
    this._dbName = `muse:photos:${this.base.pathname}`;
    this._destroyed = false;
  }

  get current() { return this.items[this.index] || null; }
  get localCount() { return this._local.length; }
  get publicCount() { return this._catalog.length; }
  get persistedCount() { return this._local.filter(item => item.persisted).length; }

  _emit(type) {
    if (this._destroyed) return;
    this.dispatchEvent(new CustomEvent(type, {
      detail: { items: this.items, index: this.index, item: this.current, status: this.status },
    }));
  }

  _setStatus(update, emit = true) {
    this.status = { ...this.status, ...update, localCount: this.localCount, publicCount: this.publicCount };
    if (emit) this._emit('change');
  }

  _savedSelection() {
    try { return localStorage.getItem(this._selectionKey); } catch { return null; }
  }

  _saveSelection() {
    try { if (this.current) localStorage.setItem(this._selectionKey, this.current.id); } catch { /* Selection is optional. */ }
  }

  _rebuild(preferredId = this.current?.id || this._savedSelection()) {
    const capacity = Math.max(0, this.maxItems - this._local.length);
    const removed = this._catalog.splice(capacity);
    removed.forEach(item => this._disposeItem(item));
    const actual = [...this._local, ...this._catalog];
    if (!actual.length && !this._studies) this._studies = createStudies();
    this.items = actual.length ? actual : this._studies.slice(0, this.maxItems);
    this.index = Math.max(0, this.items.findIndex(item => item.id === preferredId));
    this.status = {
      ...this.status,
      usingStudies: !actual.length,
      localCount: this.localCount,
      publicCount: this.publicCount,
      total: this.items.length,
    };
    this._saveSelection();
    this._emit('change');
  }

  async _openDB() {
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise(resolve => {
      if (!globalThis.indexedDB) {
        this._storageError = error('storage_unavailable', '浏览器未提供本地照片存储。');
        return resolve(null);
      }
      let request;
      try { request = indexedDB.open(this._dbName, 1); }
      catch (cause) {
        this._storageError = error('storage_unavailable', '浏览器未允许本地照片存储。', cause);
        return resolve(null);
      }
      let settled = false;
      const complete = db => {
        if (settled) { db?.close(); return; }
        settled = true;
        clearTimeout(timer);
        if (this._destroyed) { db?.close(); resolve(null); return; }
        this._db = db;
        if (db) db.onversionchange = () => { db.close(); this._db = null; this._dbPromise = null; };
        resolve(db);
      };
      const timer = setTimeout(() => {
        this._storageError = error('storage_blocked', '本地照片存储暂时不可用。');
        complete(null);
      }, 4000);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => complete(request.result);
      request.onerror = () => {
        this._storageError = error('storage_unavailable', '浏览器未允许本地照片存储。', request.error);
        complete(null);
      };
      request.onblocked = () => { this._storageError = error('storage_blocked', '另一个页面正在使用照片存储。'); };
    });
    return this._dbPromise;
  }

  async _readRecords() {
    const db = await this._openDB();
    if (!db) return [];
    try {
      const transaction = db.transaction(STORE, 'readonly');
      const records = await requestResult(transaction.objectStore(STORE).getAll());
      return records.filter(record => record?.blob instanceof Blob)
        .sort((a, b) => b.createdAt - a.createdAt || (a.ordinal || 0) - (b.ordinal || 0));
    } catch (cause) {
      this._storageError = error('storage_read_failed', '之前导入的照片暂时无法读取。', cause);
      return [];
    }
  }

  async _restoreRecord(record) {
    const src = URL.createObjectURL(record.blob);
    try {
      const image = await loadImage(src, this._abort.signal);
      return {
        id: record.id, src, image, width: image.naturalWidth, height: image.naturalHeight,
        title: String(record.title || '本地照片'), local: true, demo: false,
        persisted: true, fingerprint: record.fingerprint || '',
        createdAt: record.createdAt, ordinal: record.ordinal || 0,
        _objectURL: src,
      };
    } catch (cause) { URL.revokeObjectURL(src); throw cause; }
  }

  async _readManifest() {
    if (this.catalogURL.origin !== MODULE_BASE.origin) {
      this._manifestError = error('catalog_origin', '照片目录地址不受支持。');
      return [];
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    this._abort.signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 15000);
    try {
      const response = await fetch(this.catalogURL, { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw error('catalog_http', `照片目录暂时不可用（${response.status}）。`);
      const data = await response.json();
      const rows = Array.isArray(data) ? data : data.photos;
      if (!Array.isArray(rows)) throw error('catalog_format', '照片目录格式不正确。');
      const ids = new Set();
      const entries = [];
      for (const [index, row] of rows.entries()) {
        if (!row || row.publish !== true || typeof row.rights !== 'string' || !row.rights.trim()) continue;
        const src = imageURL(row.src, this.base);
        if (!src) continue;
        const rawId = String(row.id ?? `photo-${index + 1}`);
        const id = ids.has(rawId) ? `${rawId}-${index + 1}` : rawId;
        ids.add(id);
        entries.push({
          id, src, title: String(row.title || row.id || 'Photograph'),
          source: sourceURL(row.source), date: String(row.date || ''),
          tags: Array.isArray(row.tags) ? row.tags.filter(tag => typeof tag === 'string') : [],
          rights: row.rights.trim(), publish: true,
          depthSrc: imageURL(row.depthSrc, this.base),
          depthKind: row.depthSrc ? String(row.depthKind || row.depthType || 'provided') : undefined,
          depthModel: row.depthSrc ? String(row.depthModel || '') : undefined,
          depthType: row.depthSrc ? String(row.depthType || '') : undefined,
          depthDirection: row.depthSrc ? String(row.depthDirection || 'white-near') : undefined,
          depthNormalization: row.depthSrc ? String(row.depthNormalization || '') : undefined,
          depthDescription: row.depthSrc ? String(row.depthDescription || 'Provided depth map; white is near.') : undefined,
        });
      }
      return entries;
    } catch (cause) {
      this._manifestError = cause.code ? cause : error('catalog_unavailable', '照片暂时无法载入。', cause);
      return [];
    } finally {
      clearTimeout(timer);
      this._abort.signal.removeEventListener('abort', abort);
    }
  }

  async _loadPublic(entry) {
    const original = await loadImage(entry.src, this._abort.signal);
    const width = original.naturalWidth, height = original.naturalHeight;
    if (width * height > MAX_INPUT_PIXELS) { original.src = ''; throw error('image_too_large', '照片尺寸过大。'); }
    const image = Math.max(width, height) > this.maxDimension ? fittedCanvas(original, this.maxDimension) : original;
    if (image !== original) original.src = '';
    const item = { ...entry, image, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, local: false, demo: false };
    if (entry.depthSrc && entry.depthDirection !== 'white-near') {
      item.depthSrc = null;
      item.depthUnavailable = true;
    } else if (entry.depthSrc) {
      try {
        const depth = await loadImage(entry.depthSrc, this._abort.signal);
        item.depthImage = Math.max(depth.naturalWidth, depth.naturalHeight) > 640 ? fittedCanvas(depth, 640) : depth;
        if (item.depthImage !== depth) depth.src = '';
      } catch { item.depthSrc = null; item.depthUnavailable = true; }
    }
    return item;
  }

  async _fillCatalog() {
    const capacity = Math.max(0, this.maxItems - this._local.length);
    const retained = new Set(this._catalog.map(item => item.id));
    const choices = this._catalogEntries.filter(entry => !retained.has(entry.id)).slice(0, Math.max(0, capacity - this._catalog.length));
    const results = await mapLimited(choices, 2, entry => this._loadPublic(entry));
    if (this._destroyed) {
      results.filter(result => result.status === 'fulfilled').forEach(result => this._disposeItem(result.value));
      return { failed: 0, loaded: 0 };
    }
    const loaded = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    this._catalog.push(...loaded);
    return { failed: results.length - loaded.length, loaded: loaded.length };
  }

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      this._setStatus({ phase: 'loading', code: 'loading', message: '' });
      const [entries, records] = await Promise.all([this._readManifest(), this._readRecords()]);
      if (this._destroyed) return this;
      this._catalogEntries = entries;
      const restored = await mapLimited(records.slice(0, this.maxItems), 2, record => this._restoreRecord(record));
      if (this._destroyed) {
        restored.filter(result => result.status === 'fulfilled').forEach(result => this._disposeItem(result.value));
        return this;
      }
      this._local = restored.filter(result => result.status === 'fulfilled').map(result => result.value);
      const restoreFailed = restored.length - this._local.length;
      const catalog = await this._fillCatalog();
      if (this._destroyed) return this;
      const missing = Boolean(this._manifestError || catalog.failed || restoreFailed);
      this._setStatus({
        phase: 'ready', code: this._manifestError ? 'catalog_unavailable' : missing ? 'partial_load' : 'ready',
        message: this._manifestError ? '部分照片暂时无法载入，可以导入本地照片。' : missing ? '部分照片无法载入，其余照片可以正常查看。' : '',
        persistent: !this._storageError, storageCode: this._storageError?.code || null,
        catalogAvailable: entries.length, catalogFailed: catalog.failed, restoreFailed,
      }, false);
      this._rebuild(this._savedSelection());
      return this;
    })();
    return this._initPromise;
  }

  select(index) {
    if (!this.items.length || !Number.isFinite(Number(index))) return this.current;
    this.index = wrap(Math.trunc(Number(index)), this.items.length);
    this._saveSelection();
    this._emit('select');
    return this.current;
  }

  _enqueue(operation) {
    const task = this._queue.then(operation, operation);
    this._queue = task.catch(() => {});
    return task;
  }

  async _normalizeFile(file, ordinal, createdAt) {
    if (!(file instanceof Blob)) throw error('invalid_file', '文件无法读取。');
    if (!LOCAL_IMAGE.test(file.name || '') && !/^image\/(jpeg|pjpeg|png|webp|avif|gif|bmp|heic|heif)$/i.test(file.type)) throw error('unsupported_format', '这不是受支持的照片格式。');
    if (file.size > MAX_FILE_BYTES) throw error('file_too_large', '单张照片不能超过 40 MB。');
    if (!file.size) throw error('empty_file', '这是一个空文件。');
    const originalURL = URL.createObjectURL(file);
    let original;
    let canvas;
    try {
      original = await loadImage(originalURL, this._abort.signal);
      if (original.naturalWidth * original.naturalHeight > MAX_INPUT_PIXELS) throw error('image_too_large', '照片像素尺寸过大，请先缩小后再导入。');
      canvas = fittedCanvas(original, this.maxDimension);
      const blob = await canvasBlob(canvas);
      const id = `local-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
      const src = URL.createObjectURL(blob);
      return {
        item: {
          id, src, image: canvas, width: canvas.width, height: canvas.height,
          title: String(file.name || '本地照片').replace(/\.[^.]+$/, ''),
          local: true, demo: false, persisted: false,
          fingerprint: `${file.name || ''}|${file.size}|${file.lastModified || 0}`,
          createdAt, ordinal, _objectURL: src,
        },
        blob,
      };
    } catch (cause) {
      if (canvas) { canvas.width = canvas.height = 1; }
      throw cause;
    } finally {
      if (original) original.src = '';
      URL.revokeObjectURL(originalURL);
    }
  }

  async _writeRecords(normalized) {
    const db = await this._openDB();
    if (!db) throw this._storageError || error('storage_unavailable', '本地照片存储不可用。');
    try {
      const transaction = db.transaction(STORE, 'readwrite');
      const done = transactionDone(transaction);
      const store = transaction.objectStore(STORE);
      try {
        normalized.forEach(({ item, blob }) => store.put({
          id: item.id, blob, title: item.title, width: item.width, height: item.height,
          fingerprint: item.fingerprint, createdAt: item.createdAt, ordinal: item.ordinal,
        }));
      } catch (cause) {
        transaction.abort();
        await done.catch(() => {});
        throw cause;
      }
      await done;
    } catch (cause) {
      const quota = cause?.name === 'QuotaExceededError' || cause?.code === 22;
      throw error(quota ? 'storage_quota' : 'storage_write_failed', quota ? '浏览器存储空间不足。' : '照片未能保存到浏览器。', cause);
    }
  }

  async importFiles(files) {
    const incoming = Array.from(files || []);
    return this._enqueue(async () => {
      await this.init();
      if (this._destroyed) return { added: 0, failed: 0, skipped: incoming.length, persisted: 0, errors: [] };
      const report = { added: 0, failed: 0, skipped: 0, persisted: 0, errors: [] };
      const capacity = Math.max(0, this.maxItems - this._local.length);
      const fingerprints = new Set(this._local.map(item => item.fingerprint));
      const chosen = [];
      for (const file of incoming) {
        if (!(file instanceof Blob) || (!LOCAL_IMAGE.test(file.name || '') && !/^image\/(jpeg|pjpeg|png|webp|avif|gif|bmp|heic|heif)$/i.test(file.type))) {
          report.failed++; report.errors.push({ name: file?.name || '', code: 'unsupported_format', message: '这不是受支持的照片格式。' });
          continue;
        }
        if (!file.size || file.size > MAX_FILE_BYTES) {
          report.failed++; report.errors.push({ name: file.name || '', code: file.size ? 'file_too_large' : 'empty_file', message: file.size ? '单张照片不能超过 40 MB。' : '这是一个空文件。' });
          continue;
        }
        const fingerprint = `${file.name || ''}|${file.size}|${file.lastModified || 0}`;
        if (fingerprints.has(fingerprint)) {
          report.skipped++; report.errors.push({ name: file.name || '', code: 'duplicate', message: '已导入这张照片。' });
        } else if (chosen.length >= capacity) {
          report.skipped++; report.errors.push({ name: file.name || '', code: 'limit_reached', message: `最多保留 ${this.maxItems} 张本地照片。` });
        } else {
          fingerprints.add(fingerprint);
          chosen.push(file);
        }
      }
      if (!chosen.length) {
        this._setStatus({ phase: 'ready', code: report.failed ? 'import_failed' : capacity ? 'nothing_to_import' : 'limit_reached', message: report.failed ? '没有照片成功导入，请检查文件格式和大小。' : capacity ? '这些照片已经导入，或没有选择照片。' : `最多保留 ${this.maxItems} 张本地照片，请先清除本地照片。`, importReport: report });
        return report;
      }
      const previousSelection = this.current?.id;
      this._setStatus({ phase: 'importing', code: 'importing', message: `正在处理 ${chosen.length} 张照片…`, importReport: null });
      // Reserve the decoded-image budget before reading a large local batch.
      // Public entries can be loaded again if an imported file fails.
      const keepPublic = Math.max(0, this.maxItems - this._local.length - chosen.length);
      this._catalog.splice(keepPublic).forEach(item => this._disposeItem(item));
      this._rebuild(previousSelection);
      const createdAt = Date.now();
      const results = await mapLimited(chosen, 2, (file, ordinal) => this._normalizeFile(file, ordinal, createdAt));
      const normalized = [];
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') normalized.push(result.value);
        else {
          report.failed++;
          report.errors.push({ name: chosen[i].name || '', code: result.reason.code || 'import_failed', message: result.reason.message || '照片无法导入。' });
        }
      });
      if (this._destroyed) {
        normalized.forEach(({ item }) => this._disposeItem(item));
        return report;
      }
      let persistenceError = null;
      if (normalized.length) {
        try {
          await this._writeRecords(normalized);
          normalized.forEach(({ item }) => { item.persisted = true; });
          report.persisted = normalized.length;
        } catch (cause) { persistenceError = cause; }
        if (this._destroyed) {
          normalized.forEach(({ item }) => this._disposeItem(item));
          return report;
        }
        this._local.unshift(...normalized.map(({ item }) => item));
        report.added = normalized.length;
      }
      await this._fillCatalog();
      if (this._destroyed) return report;
      const code = !report.added ? 'import_failed' : persistenceError ? 'session_only' : report.failed || report.skipped ? 'import_partial' : 'imported';
      const message = !report.added ? '没有照片成功导入，请检查文件格式。'
        : persistenceError ? `已载入 ${report.added} 张照片；浏览器未能保存，刷新或离开页面后需要重新导入。`
          : report.failed ? `已导入 ${report.added} 张照片，${report.failed} 张无法读取。`
            : report.skipped ? `已导入 ${report.added} 张照片，${report.skipped} 张已跳过。`
              : `已导入 ${report.added} 张照片。`;
      if (persistenceError) report.errors.push({ name: '', code: persistenceError.code, message: persistenceError.message });
      this._setStatus({ phase: 'ready', code, message, persistent: !persistenceError && !this._storageError, importReport: report }, false);
      this._rebuild(normalized[0]?.item.id || previousSelection);
      return report;
    });
  }

  async clearLocal() {
    return this._enqueue(async () => {
      await this.init();
      const saved = this._local.some(item => item.persisted);
      const db = await this._openDB();
      try {
        if (db) {
          const transaction = db.transaction(STORE, 'readwrite');
          const done = transactionDone(transaction);
          transaction.objectStore(STORE).clear();
          await done;
        } else if (saved) throw error('storage_unavailable', '暂时无法清除已保存的照片，请重试。');
      } catch (cause) {
        this._setStatus({ phase: 'ready', code: 'clear_failed', message: '暂时无法清除已保存的照片，请重试。' });
        return { cleared: 0, error: cause.code || 'clear_failed' };
      }
      const cleared = this._local.length;
      this._local.forEach(item => this._disposeItem(item));
      this._local = [];
      await this._fillCatalog();
      this._setStatus({ phase: 'ready', code: 'cleared', message: db ? '已清除本地照片。' : '已清除当前页面的照片；浏览器存储暂时无法访问。', persistent: !this._storageError, importReport: null }, false);
      this._rebuild();
      return { cleared, storageCleared: Boolean(db) };
    });
  }

  _disposeItem(item) {
    if (item._objectURL) URL.revokeObjectURL(item._objectURL);
    if (item.image instanceof HTMLCanvasElement) item.image.width = item.image.height = 1;
    else if (item.image instanceof HTMLImageElement) item.image.src = '';
    if (item.depthImage instanceof HTMLCanvasElement) item.depthImage.width = item.depthImage.height = 1;
    else if (item.depthImage instanceof HTMLImageElement) item.depthImage.src = '';
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._abort.abort();
    this._db?.close();
    [...this._local, ...this._catalog, ...(this._studies || [])].forEach(item => this._disposeItem(item));
    this._local = this._catalog = this.items = [];
    this._studies = null;
    this._catalogEntries = [];
    this._db = null;
  }
}
