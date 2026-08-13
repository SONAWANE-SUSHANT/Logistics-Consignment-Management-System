const { pool } = require('../config/db');

const snake = (value) => value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const relationLoaders = {
  consignerId: () => require('./Customer'),
  consigneeId: () => require('./Customer'),
  customerId: () => require('./Customer'),
  tripId: () => require('./Trip'),
  freightBillId: () => require('./FreightBill'),
  createdBy: () => require('./User'),
};

const parseFields = (fields) => {
  if (!fields) return null;
  return String(fields).split(/\s+/).filter(Boolean);
};

class PgDocument {
  constructor(model, data) {
    Object.defineProperty(this, '$model', { value: model, enumerable: false });
    Object.assign(this, data);
  }

  async save() {
    const saved = await this.$model.updateById(this._id, this);
    Object.assign(this, saved);
    return this;
  }

  async deleteOne() {
    await this.$model.deleteById(this._id);
  }
}

class PgQuery {
  constructor(model, filter = {}, single = false) {
    this.model = model;
    this.filter = filter || {};
    this.single = single;
    this._limit = null;
    this._skip = 0;
    this._sort = null;
    this._select = null;
    this._populates = [];
  }

  limit(value) {
    this._limit = Number(value);
    return this;
  }

  skip(value) {
    this._skip = Number(value) || 0;
    return this;
  }

  sort(value) {
    this._sort = value;
    return this;
  }

  select(value) {
    this._select = value;
    return this;
  }

  populate(path, fields) {
    this._populates.push({ path, fields: parseFields(fields) });
    return this;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }

  async exec() {
    let rows = await this.model.findRows(this.filter, {
      limit: this.single ? 1 : this._limit,
      skip: this._skip,
      sort: this._sort,
      select: this._select,
    });

    if (this._populates.length) {
      rows = await this.model.populateRows(rows, this._populates);
    }

    return this.single ? rows[0] || null : rows;
  }
}

class PgModel {
  constructor({ table, fields, columns = {}, jsonFields = [] }) {
    this.table = table;
    this.fields = fields;
    this.jsonFields = new Set(jsonFields);
    this.fieldToColumn = fields.reduce((map, field) => {
      map[field] = columns[field] || (field === '_id' ? 'id' : snake(field));
      return map;
    }, {});
    Object.assign(this.fieldToColumn, columns);
    // Build the reverse (column -> field) map from the model's own `fields` list ONLY.
    // `columns` can also carry dotted search aliases (e.g. 'customerSnapshot.companyName')
    // that resolve to the SAME db column as a real field (e.g. 'companyName' -> company_name,
    // used for filtering/search). If those aliases were allowed into this reverse map they'd
    // win the lookup (since they're merged in after the real fields), and hydrate() would end
    // up writing the column's value onto a literal 'customerSnapshot.companyName' key instead
    // of doc.companyName — leaving doc.companyName undefined even though the column has data.
    this.columnToField = fields.reduce((map, field) => {
      map[this.fieldToColumn[field]] = field;
      return map;
    }, {});
  }

  hydrate(row) {
    if (!row) return null;
    const data = {};
    Object.entries(row).forEach(([column, value]) => {
      const field = this.columnToField[column] || column;
      data[field] = value;
    });
    data._id = data._id || data.id;
    return new PgDocument(this, data);
  }

  toDb(data) {
    const db = {};
    this.fields.forEach((field) => {
      if (field === '_id' || field === 'id' || field === 'createdAt' || field === 'updatedAt' || data[field] === undefined) return;
      const column = this.fieldToColumn[field];
      db[column] = this.jsonFields.has(field) ? JSON.stringify(data[field] ?? null) : data[field];
    });
    return db;
  }

  column(field) {
    return quoteIdent(this.fieldToColumn[field] || snake(field));
  }

  tableName() {
    return quoteIdent(this.table);
  }

  async create(data) {
    const db = this.toDb(data);
    const columns = Object.keys(db);
    const values = Object.values(db);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const sql = `INSERT INTO ${this.tableName()} (${columns.map(quoteIdent).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await pool.query(sql, values);
    return this.hydrate(result.rows[0]);
  }

  async insertMany(items) {
    const inserted = [];
    for (const item of items) inserted.push(await this.create(item));
    return inserted;
  }

  find(filter = {}) {
    return new PgQuery(this, filter, false);
  }

  findById(id) {
    return new PgQuery(this, { _id: id }, true);
  }

  async findOne(filter = {}) {
    return new PgQuery(this, filter, true).exec();
  }

  async countDocuments(filter = {}) {
    const { where, values } = this.buildWhere(filter);
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${this.tableName()}${where}`, values);
    return result.rows[0].count;
  }

  async exists(filter = {}) {
    const found = await new PgQuery(this, filter, true).select('_id').exec();
    return found ? { _id: found._id } : null;
  }

  async updateById(id, data) {
    const db = this.toDb(data);
    const columns = Object.keys(db);
    if (!columns.length) return this.findById(id);
    const values = Object.values(db);
    values.push(id);
    const setSql = columns.map((column, index) => `${quoteIdent(column)} = $${index + 1}`).join(', ');
    const sql = `UPDATE ${this.tableName()} SET ${setSql}, ${quoteIdent('updated_at')} = NOW() WHERE ${quoteIdent('id')} = $${values.length} RETURNING *`;
    const result = await pool.query(sql, values);
    return this.hydrate(result.rows[0]);
  }

  async updateMany(filter, updates) {
    const db = this.toDb(updates);
    const columns = Object.keys(db);
    if (!columns.length) return { modifiedCount: 0 };
    const values = Object.values(db);
    const setSql = columns.map((column, index) => `${quoteIdent(column)} = $${index + 1}`).join(', ');
    const whereData = this.buildWhere(filter, values.length + 1);
    const sql = `UPDATE ${this.tableName()} SET ${setSql}, ${quoteIdent('updated_at')} = NOW()${whereData.where}`;
    const result = await pool.query(sql, [...values, ...whereData.values]);
    return { modifiedCount: result.rowCount };
  }

  async deleteMany(filter = {}) {
    const { where, values } = this.buildWhere(filter);
    const result = await pool.query(`DELETE FROM ${this.tableName()}${where}`, values);
    return { deletedCount: result.rowCount };
  }

  async deleteById(id) {
    const result = await pool.query(`DELETE FROM ${this.tableName()} WHERE ${quoteIdent('id')} = $1`, [id]);
    return { deletedCount: result.rowCount };
  }

  async findRows(filter, options = {}) {
    const { where, values } = this.buildWhere(filter);
    const select = this.buildSelect(options.select);
    const order = this.buildSort(options.sort);
    const limit = options.limit ? ` LIMIT ${Number(options.limit)}` : '';
    const offset = options.skip ? ` OFFSET ${Number(options.skip)}` : '';
    const result = await pool.query(`SELECT ${select} FROM ${this.tableName()}${where}${order}${limit}${offset}`, values);
    return result.rows.map((row) => this.hydrate(row));
  }

  buildSelect(select) {
    if (!select) return '*';
    const raw = parseFields(select);
    if (String(select).trim().startsWith('-')) {
      const excluded = new Set(raw.map((f) => f.replace(/^-/, '')));
      const columns = this.fields
        .filter((field) => field !== '_id' && !excluded.has(field))
        .map((field) => this.column(field));
      if (!columns.includes(quoteIdent('id'))) columns.push(quoteIdent('id'));
      return columns.join(', ');
    }
    const columns = raw.map((field) => this.column(field));
    if (!columns.includes(quoteIdent('id'))) columns.push(quoteIdent('id'));
    return columns.join(', ');
  }

  buildSort(sort) {
    if (!sort) return '';
    if (typeof sort === 'string') {
      const desc = sort.startsWith('-');
      const field = desc ? sort.slice(1) : sort;
      return ` ORDER BY ${this.column(field)} ${desc ? 'DESC' : 'ASC'}`;
    }
    const clauses = Object.entries(sort).map(([field, direction]) => `${this.column(field)} ${Number(direction) < 0 ? 'DESC' : 'ASC'}`);
    return clauses.length ? ` ORDER BY ${clauses.join(', ')}` : '';
  }

  buildWhere(filter = {}, startIndex = 1) {
    const values = [];
    const clauses = this.conditionClauses(filter, values, startIndex);
    return {
      where: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '',
      values,
    };
  }

  conditionClauses(filter, values, startIndex) {
    const clauses = [];
    Object.entries(filter || {}).forEach(([field, condition]) => {
      if (field === '$or') {
        const orClauses = condition
          .map((part) => this.conditionClauses(part, values, startIndex).join(' AND '))
          .filter(Boolean);
        if (orClauses.length) clauses.push(`(${orClauses.map((clause) => `(${clause})`).join(' OR ')})`);
        return;
      }

      const column = field.includes('.') && !this.fieldToColumn[field]
        ? `${this.column(field.split('.')[0])}->>'${field.split('.').slice(1).join('.')}'`
        : this.column(field);

      if (condition instanceof RegExp) {
        values.push(`%${condition.source.replace(/\\([.*+?^${}()|[\]\\])/g, '$1')}%`);
        clauses.push(`${column} ILIKE $${startIndex + values.length - 1}`);
        return;
      }

      if (condition && typeof condition === 'object' && !Array.isArray(condition) && !(condition instanceof Date)) {
        Object.entries(condition).forEach(([op, value]) => {
          if (value === undefined) return;
          if (op === '$in') {
            const list = Array.isArray(value) ? value : [];
            if (!list.length) {
              clauses.push('FALSE');
              return;
            }
            const placeholders = list.map((item) => {
              values.push(item);
              return `$${startIndex + values.length - 1}`;
            });
            clauses.push(`${column} IN (${placeholders.join(', ')})`);
          } else if (op === '$gte' || op === '$lte' || op === '$lt' || op === '$gt' || op === '$ne') {
            values.push(value);
            const operators = { $gte: '>=', $lte: '<=', $lt: '<', $gt: '>', $ne: '<>' };
            clauses.push(`${column} ${operators[op]} $${startIndex + values.length - 1}`);
          }
        });
        return;
      }

      values.push(condition);
      clauses.push(`${column} = $${startIndex + values.length - 1}`);
    });
    return clauses;
  }

  async populateRows(rows, populates) {
    const output = [...rows];
    for (const populate of populates) {
      const Model = relationLoaders[populate.path]?.();
      if (!Model) continue;
      const ids = [...new Set(output.map((row) => row[populate.path]).filter(Boolean))];
      if (!ids.length) continue;
      const records = await Model.find({ _id: { $in: ids } }).exec();
      const map = new Map(records.map((record) => [String(record._id), this.pickFields(record, populate.fields)]));
      output.forEach((row) => {
        row[populate.path] = map.get(String(row[populate.path])) || null;
      });
    }
    return output;
  }

  pickFields(record, fields) {
    if (!fields?.length) return record;
    const picked = { _id: record._id, id: record.id };
    fields.forEach((field) => {
      picked[field] = record[field];
    });
    return picked;
  }

  async aggregate(pipeline = []) {
    const matchStage = pipeline.find((stage) => stage.$match)?.$match || {};
    const groupStage = pipeline.find((stage) => stage.$group)?.$group;
    const sortStage = pipeline.find((stage) => stage.$sort)?.$sort;
    const { where, values } = this.buildWhere(matchStage);

    if (!groupStage) return [];

    if (typeof groupStage._id === 'string') {
      const field = groupStage._id.replace('$', '');
      const column = this.column(field);
      const countKey = Object.keys(groupStage).find((key) => key !== '_id') || 'count';
      const order = sortStage
        ? ` ORDER BY ${Object.entries(sortStage).map(([key, value]) => `${quoteIdent(key)} ${Number(value) < 0 ? 'DESC' : 'ASC'}`).join(', ')}`
        : '';
      const result = await pool.query(`SELECT ${column} AS _id, COUNT(*)::int AS ${quoteIdent(countKey)} FROM ${this.tableName()}${where} GROUP BY ${column}${order}`, values);
      return result.rows;
    }

    const dateExpr = groupStage._id?.year?.$year || groupStage._id?.month?.$month;
    if (dateExpr) {
      const field = dateExpr.replace('$', '');
      const column = this.column(field);
      const result = await pool.query(
        `SELECT json_build_object('year', EXTRACT(YEAR FROM ${column})::int, 'month', EXTRACT(MONTH FROM ${column})::int) AS _id, COUNT(*)::int AS count FROM ${this.tableName()}${where} GROUP BY EXTRACT(YEAR FROM ${column}), EXTRACT(MONTH FROM ${column})`,
        values
      );
      return result.rows;
    }

    return [];
  }
}

module.exports = PgModel;