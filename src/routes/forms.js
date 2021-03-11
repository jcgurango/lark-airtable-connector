const { Router } = require('express');
const router = Router();
const qs = require('querystring');
const Airtable = require('airtable');
Airtable.configure({
  apiKey: process.env.AIRTABLE_API_KEY,
  endpointUrl: process.env.AIRTABLE_ENDPOINT,
});
const base = Airtable.base(process.env.AIRTABLE_BASE);
const jwt = require('jsonwebtoken');
const key = 'testsigningkey';

/*
base.table('Test Record Creation/Update').select({ }).firstPage().then((records) => {
  console.log(records);
});
*/

const makeToken = (data = { }) => {
  return jwt.sign({ user: 'JC Gurango', ...data }, key);
};

router.get('/create', (req, res) => {
  res.redirect('https://airtable.com/shrVua9914tWD07s1?prefill_Token=' + makeToken());
});

router.get('/update/:id', async (req, res) => {
  const prefillData = { };
  const data = await base.table('Test Record Creation/Update').find(req.params.id);
  
  Object.keys(data.fields).forEach((field) => {
    prefillData['prefill_' + field] = data.fields[field];
  });

  prefillData['prefill_Token'] = makeToken({ update: req.params.id });

  res.redirect('https://airtable.com/shrVua9914tWD07s1?' + qs.stringify(prefillData));
});

module.exports = router;
