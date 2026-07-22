const { google } = require('googleapis');

async function main() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/logging.read'],
  });

  const logging = google.logging({ version: 'v2', auth });

  const projectId = 'gen-lang-client-0295711280';
  const filter = `resource.type="cloud_run_revision" AND resource.labels.service_name="test-mkt-dashboard"`;

  console.log(`Fetching logs for project ${projectId} with filter: ${filter}`);
  try {
    const res = await logging.entries.list({
      requestBody: {
        resourceNames: [`projects/${projectId}`],
        filter: filter,
        orderBy: 'timestamp desc',
        pageSize: 50,
      },
    });

    if (res.data.entries && res.data.entries.length > 0) {
      res.data.entries.reverse().forEach((entry) => {
        const time = entry.timestamp;
        const severity = entry.severity || 'DEFAULT';
        const msg = entry.textPayload || JSON.stringify(entry.jsonPayload) || 'No payload';
        console.log(`[${time}] [${severity}] ${msg}`);
      });
    } else {
      console.log('No logs found.');
    }
  } catch (e) {
    console.error('Error fetching logs:', e.message);
  }
}

main();
