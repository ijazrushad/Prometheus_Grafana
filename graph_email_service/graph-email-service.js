// graph_email_service/graph-email-service.js
const express = require('express');
const axios = require('axios');
const app = express();

// Microsoft Graph API configuration
const GRAPH_CONFIG = {
  tenantId: 'YOUR_TENANT_ID',
  clientId: 'YOUR_client_ID',
  clientSecret: 'YOUR_secret_ID',
  fromEmail: 'YOUR_EMAIL',
  toEmail: 'YOUR_EMAIL'
};

app.use(express.json());

// Function to get access token from Microsoft Graph
async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${GRAPH_CONFIG.tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append('client_id', GRAPH_CONFIG.clientId);
  params.append('client_secret', GRAPH_CONFIG.clientSecret);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');

  try {
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    throw error;
  }
}

// Function to send email via Microsoft Graph
async function sendEmail(accessToken, subject, body) {
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${GRAPH_CONFIG.fromEmail}/sendMail`;
  
  const emailData = {
    message: {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: body
      },
      toRecipients: [
        {
          emailAddress: {
            address: GRAPH_CONFIG.toEmail
          }
        }
      ]
    }
  };

  try {
    await axios.post(graphUrl, emailData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
    throw error;
  }
}

// Webhook endpoint for Alertmanager
app.post('/webhook', async (req, res) => {
  try {
    const alertData = req.body;
    console.log('Received alert:', JSON.stringify(alertData, null, 2));

    // Get access token
    const accessToken = await getAccessToken();

    // Process alerts
    let subject = 'Prometheus Alert';
    let body = '<h2>Prometheus Alert Notification</h2>';

    if (alertData.alerts && alertData.alerts.length > 0) {
      const alert = alertData.alerts[0]; // Take first alert for subject
      subject = `Alert: ${alert.labels?.alertname || 'Unknown'} - ${alert.status}`;
      
      body += '<table border="1" style="border-collapse: collapse; width: 100%;">';
      body += '<tr><th>Alert</th><th>Status</th><th>Instance</th><th>Severity</th><th>Description</th></tr>';
      
      alertData.alerts.forEach(alert => {
        body += '<tr>';
        body += `<td>${alert.labels?.alertname || 'N/A'}</td>`;
        body += `<td style="color: ${alert.status === 'firing' ? 'red' : 'green'}">${alert.status}</td>`;
        body += `<td>${alert.labels?.instance || 'N/A'}</td>`;
        body += `<td>${alert.labels?.severity || 'N/A'}</td>`;
        body += `<td>${alert.annotations?.description || alert.annotations?.summary || 'N/A'}</td>`;
        body += '</tr>';
      });
      
      body += '</table>';
      body += `<p><strong>Group:</strong> ${alertData.groupKey || 'N/A'}</p>`;
      body += `<p><strong>Receiver:</strong> ${alertData.receiver || 'N/A'}</p>`;
      body += `<p><strong>Status:</strong> ${alertData.status || 'N/A'}</p>`;
    }

    // Send email
    await sendEmail(accessToken, subject, body);

    res.status(200).json({ message: 'Alert processed and email sent' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process alert' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Graph Email Service running on port ${PORT}`);
});

module.exports = app;