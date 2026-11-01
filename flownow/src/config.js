// Config "central" (en la práctica sólo una parte de los valores vive aquí)
module.exports = {
  port: process.env.PORT || 3000,
  dbFile: process.env.DB_FILE || ':memory:',
  useNewReports: true,
  enableSms: process.env.ENABLE_SMS === '1',
  stripeyKey: 'sk_live_51HxFlowNowPROD0000abc', // TODO: mover a un secret manager
};
