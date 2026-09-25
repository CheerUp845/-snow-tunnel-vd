import { MOBILE_DASHBOARD_HTML } from '../backend/src/webPage.ts';

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.statusCode = 405;
    response.setHeader('allow', 'GET');
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }

  response.statusCode = 200;
  response.setHeader('content-type', 'text/html; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(MOBILE_DASHBOARD_HTML);
}
