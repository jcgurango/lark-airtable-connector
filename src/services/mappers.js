const createMapper = (singleMapper = (obj) => ({ })) => {
  return {
    single: singleMapper,
    multiple: (array) => array.map(singleMapper),
  };
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
  dailyAttendanceToAirTable: createMapper(({
    ColumnMap: {
      '51201': { Value: RecordDate },
      '50103': { Value: EmployeeID },
      '51302': { Value: RequiredDuration },
      '51303': { Value: ActualDuration },
      '51307': { Value: Overtime },
      '51401': { Value: LeaveTime },
    },
  }) => {
    const parsedDate = RecordDate.slice(0, 4) + '-' + RecordDate.slice(4, 6) + '-' + RecordDate.slice(6, 8);
    return {
      'ID': EmployeeID + '-' + RecordDate,
      'Date': parsedDate,
      'Employee ID': EmployeeID,
      'Required Duration': Number(RequiredDuration),
      'Actual Duration': Number(ActualDuration),
      'Overtime Hours': Number(Overtime.replace(/[^\d.,]/g, '')),
      'Leave Time': Number(LeaveTime.replace(/[^\d.,]/g, '')),
    };
  })
};
