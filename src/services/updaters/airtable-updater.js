const Table = require('airtable/lib/table');

module.exports = {
  /**
   * 
   * @param {Table} table 
   * @param {(table: Table, updateData: { }) => Promise<boolean>} preProcess 
   * @param {String} keyField 
   * @param {String[]} saveFields
   */
  create: (table, preProcess = null, keyField = '', saveFields = []) => {
    return async (records) => await Promise.all(records.map(async (record) => {
      let recordId = null;

      // If a key field is specified, find an existing record first.
      if (keyField) {
        const formula = `${keyField === 'id' ? 'RECORD_ID()' : `{${keyField}}`} = ${JSON.stringify(record[keyField])}`;

        const results = await table.select({
          filterByFormula: formula,
          pageSize: 1,
        }).firstPage();

        if (results.length > 0) {
          recordId = results[0].id;
        }
      }

      const updateData = {};

      if (saveFields && saveFields.length) {
        saveFields.forEach((field) => {
          if (field in record) {
            updateData[field] = record[field];
          }
        });
      } else {
        updateData = record;
      }

      if (preProcess) {
        if (!await preProcess(table, updateData)) {
          return await preProcess(table, updateData);
        }
      }

      if (recordId) {
        await table.update(recordId, updateData);
      } else {
        await table.create(updateData);
      }
    }));
  },
};
