const jwt = require('jsonwebtoken');

// Create an airtable base and instance.
const Airtable = require('airtable');
Airtable.configure({
  apiKey: process.env.AIRTABLE_API_KEY,
  endpointUrl: process.env.AIRTABLE_ENDPOINT,
});

const base = Airtable.base(process.env.AIRTABLE_BASE);

// Airtable retrieval processes.
const airtableRetriever = require('./services/retrievers/airtable-retriever');

// Airtable updater processes.
const airtableUpdater = require('./services/updaters/airtable-updater');

// Lark admin coordinator.
const larkAdmin = require('./services/lark-admin');

// Attendance retrieval processes.
const attendanceRetriever = require('./services/retrievers/attendance-retriever')(larkAdmin);

// Retriever/updater for leave balances.
const leaveRetriever = airtableRetriever.create(base('Test Leave Balance'), 'Updated');
const leaveUpdater = require('./services/updaters/leave-updater')(larkAdmin);

// Mappers.
const mappers = require('./services/mappers');

module.exports = {
  start: async () => {
    // Initialize any authentication with the lark admin.
    await larkAdmin.init();

    // Create the update coordinator.
    const coordinator = require('./services/update-coordinator');

    // Register the retrievers/writers.
    /*
    coordinator.register(
      leaveRetriever,
      mappers.leaveBalanceToLark.multiple,
      leaveUpdater.updateLeaves,
    );
    */
    coordinator.register(
      () => attendanceRetriever.retrieveAttendance(),
      mappers.dailyAttendanceToAirTable.multiple,
      airtableUpdater.create(
        base('Attendance'),
        async (table, updateData) => {
          if (!updateData['Employee ID']) {
            return false;
          }

          const [employee] = await base('Employee').select({
            filterByFormula: `{Employee ID} = ${JSON.stringify(updateData['Employee ID'])}`,
            pageSize: 1,
          }).firstPage();

          if (employee) {
            delete updateData['Employee ID'];
            updateData['Employee'] = [employee.id];

            return true;
          }

          return false;
        },
        'ID',
        ['Date', 'Employee ID', 'Required Duration', 'Actual Duration', 'Overtime Hours', 'Leave Time']
      )
    );

    coordinator.poll(5000);
  },
};
