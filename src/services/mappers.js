const createMapper = (singleMapper = (obj) => ({ })) => {
  return {
    single: singleMapper,
    multiple: (array) => array.map(singleMapper),
  };
};

const parseDuration = (durationText) => {
  const match = /(\d{2}):(\d{2})/g.exec(durationText);

  if (match) {
    return ((match[1] * 60) + Number(match[2])) * 60;
  }

  return 0;
};

module.exports = {
  // Maps a leave balance record to Lark.
  leaveBalanceToLark: createMapper(({
    fields: {
      'Employee Leave ID': [EmployeeLeaveID],
      'Leave Type ID': [LeaveTypeID],
      'Leave Balance': LeaveBalance,
    },
  }) => {
    return {
      userId: EmployeeLeaveID,
      defId: LeaveTypeID,
      balance: LeaveBalance,
    };
  }),
  // Maps a daily attendance record from Lark to AirTable format.
  dailyAttendanceToAirTable: createMapper((record) => {
    const {
      ColumnMap: {
        '51201': { Value: RecordDate },
        '51202': { Value: ShiftText },
        '50103': { Value: EmployeeID },
        '51302': { Value: RequiredDuration },
        '51303': { Value: ActualDuration },
        '51307': { Value: Overtime },
        '51401': { Value: LeaveTime },
        '51402': { Value: LeaveType },
      },
    } = record;

    let match;
    let shiftStart = null;
    let shiftEnd = null;
    const regex = /(next day )?(\d{2}:\d{2})/g;

    // Parse Shift start/end from text
    while (match = regex.exec(ShiftText)) {
      const [, isNextDay, duration] = match;
      let actual = 0;

      if (isNextDay) {
        actual += 24 * 60;
      }

      actual += parseDuration(duration);

      if (shiftStart === null) {
        shiftStart = actual;
      } else if (shiftEnd === null) {
        shiftEnd = actual;
      }
    }

    const parsedDate = RecordDate.slice(0, 4) + '-' + RecordDate.slice(4, 6) + '-' + RecordDate.slice(6, 8);

    // Parse first-in/last-out.
    const inColumns = Object.keys(record.ColumnMap).filter((c) => /51502-\d+-1/g.exec(c));
    const outColumns = Object.keys(record.ColumnMap).filter((c) => /51502-\d+-2/g.exec(c));
    let firstInText = record.ColumnMap[inColumns[0]].Value;

    // Grab the last outColumn value that isn't a '-'.
    let lastOutText = '-';

    for (let i = 0; i < outColumns.length; i++) {
      const outColumn = outColumns[i];
      const value = record.ColumnMap[outColumn].Value;

      if (value !== '-') {
        lastOutText = value;
      }
    }

    // Parse the times from text.
    const firstIn = firstInText === '-' ? null : parseDuration(firstInText);
    const lastOut = lastOutText === '-' ? null : parseDuration(lastOutText);

    return {
      'ID': EmployeeID + '-' + RecordDate,
      'Date': parsedDate,
      'Employee ID': EmployeeID,
      'Required Duration': Number(RequiredDuration) * 60,
      'Actual Duration': Number(ActualDuration) * 60,
      'Overtime Hours': Number(Overtime.replace(/[^\d.,]/g, '')),
      'Leave Time': Number(LeaveTime.replace(/[^\d.,]/g, '')),
      'Leave Type': LeaveType === '-' ? null : LeaveType,
      'Shift Time In': shiftStart,
      'Shift Time Out': shiftEnd,
      'First In': firstIn,
      'Last Out': lastOut,
    };
  })
};
