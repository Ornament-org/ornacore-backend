export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  findById(id, options = {}) {
    return this.model.findByPk(id, options);
  }

  findOne(where, options = {}) {
    return this.model.findOne({ ...options, where });
  }

  findAll(where = {}, options = {}) {
    return this.model.findAll({ ...options, where });
  }

  create(payload, options = {}) {
    return this.model.create(payload, options);
  }

  async updateById(id, payload, options = {}) {
    const record = await this.findById(id, options);
    if (!record) return null;
    return record.update(payload, options);
  }
}
