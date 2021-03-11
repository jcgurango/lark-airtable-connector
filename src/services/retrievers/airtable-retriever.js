const { Base, Table } = require('airtable');

module.exports = {
  /**
   * 
   * @param {Table} table 
   * @param {String} updatedAtField 
   */
  create: (table, updatedAtField) => {
    return async (lastUpdatedTime = 0) => {
      console.log('Polling ' + table.name + ' for new records since ' + (new Date(lastUpdatedTime)).toLocaleString() + '...');
      const allRecords = [];

      await new Promise((resolve, reject) => {
        table.select({
          pageSize: 100,
          filterByFormula: `{${updatedAtField}} > '${(new Date(lastUpdatedTime)).toISOString()}'`,
        }).eachPage((records, nextPage) => {
          allRecords.push(...records.map((record) => record._rawJson));
          nextPage();
        }, (err) => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        });
      });

      if (allRecords.length > 0) {
        console.log('Found ' + allRecords.length + ' updated records from ' + table.name + '!');
      }

      return allRecords;
    };
  },
};
