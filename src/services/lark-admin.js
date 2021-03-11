const { adminLogin } = require('lark-admin-simulator');
const got = require('got');
const tough = require('tough-cookie');
const qrcodeTerminal = require('qrcode-terminal');
const CookieFileStore = require('tough-cookie-file-store').FileCookieStore
const fs = require('fs');

let cookies = null;

const getCsrfCookie = async (url = 'https://www.larksuite.com/approval/admin/approvalList', tokenCookie = '_csrf_token') => {
  const all = await cookies.getCookies(url);
  const cookie = all.find(({ key }) => key === tokenCookie);
  return cookie.value;
};

module.exports = {
  init: async () => {
    if (fs.existsSync('.larkadmincookie')) {
      cookies = new tough.CookieJar(new CookieFileStore('.larkadmincookie'));
    } else {
      const cookieJar = new tough.CookieJar(new CookieFileStore('.larkadmincookie'));

      await adminLogin(
        (code) => {
          qrcodeTerminal.generate(code, { small: true });
          console.log('Please scan this QR code to continue.');
        },
        async (page) => {
          const cookies = await page.cookies();

          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            cookieJar.setCookie(new tough.Cookie({
              key: cookie.name,
              value: cookie.value,
              httpOnly: cookie.httpOnly,
              secure: cookie.secure,
            }), page.url());
          }

          const retrieveOtherCookies = async (appId, wait) => {
            await page.goto(`https://${process.env.LARK_TENANT_SUBDOMAIN}.larksuite.com/admin_console/appCenter/manage/${appId}`, { waitUntil: 'networkidle2' });
            await page.waitForSelector('.ant-col.ant-col-12 a');
            await page.evaluate(() => {
              document.querySelector('.ant-col.ant-col-12 a').click();
            });

            const pageTarget = page.target();
            const otherPageTarget = await page.browser().waitForTarget((target) => target.opener() === pageTarget);
            const otherPage = await otherPageTarget.page();
            await wait(otherPage);
            const otherPageCookies = await otherPage.cookies();

            for (let i = 0; i < otherPageCookies.length; i++) {
              const cookie = otherPageCookies[i];
              await cookieJar.setCookie(new tough.Cookie({
                key: cookie.name,
                value: cookie.value,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
                path: cookie.path,
              }), otherPage.url());
            }
          };

          await retrieveOtherCookies('cli_9dc2bfd708759106', (otherPage) => (otherPage.waitForSelector('.ant-layout-content')));
          //await retrieveOtherCookies('cli_9c7cc8a9a9edd105', (otherPage) => (otherPage.waitForSelector('.ant-breadcrumb-link')));
        },
      );

      cookies = cookieJar;
    }
  },
  attendance: {
    getColumns: async (TaskType = 'daily') => {
      const csrf = await getCsrfCookie('https://www.larksuite.com/attendance/manage', 'lob_csrf_token');

      const { body: { data } } = await got('https://www.larksuite.com/attendance/manage/GetStatisticsColumns', {
        method: 'POST',
        json: {
          Body: { TaskType },
          Head: {},
        },
        cookieJar: cookies,
        headers: {
          'x-csrftoken': csrf,
        },
        responseType: 'json',
      });

      return data;
    },
    getStatistics: async (query) => {
      const csrf = await getCsrfCookie('https://www.larksuite.com/attendance/manage', 'lob_csrf_token');

      const { body } = await got('https://www.larksuite.com/attendance/manage/GetStatisticsList', {
        method: 'POST',
        json: query,
        cookieJar: cookies,
        headers: {
          'x-csrftoken': csrf,
        },
        responseType: 'json',
      });

      return body.data;
    },
  },
  leaves: {
    getBalanceLog: async (defId, userId) => {
      const { body } = await got('https://www.larksuite.com/approval/admin/api/GetBalanceLogForUser', {
        method: 'POST',
        json: {
          defId,
          userId,
        },
        cookieJar: cookies,
        responseType: 'json',
      });

      return body.data;
    },
    updateBalance: async (defId, userId, deltaQuota, reason = '') => {
      const csrf = await getCsrfCookie();

      const { body } = await got('https://www.larksuite.com/approval/admin/api/leave/balance/update', {
        method: 'POST',
        json: {
          balanceDefinitionId: defId,
          deltaQuota,
          userId,
          reason,
        },
        headers: {
          'x-csrftoken': csrf,
        },
        cookieJar: cookies,
        responseType: 'json',
      });

      return body.data;
    },
  },
};
