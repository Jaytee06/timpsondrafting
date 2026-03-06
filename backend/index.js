const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const Busboy = require('busboy');

const ses = new SESClient({ region: 'us-west-2' }); // Change region if needed
const ADMIN_EMAIL = 'admin@tad.software';
const SOURCE_EMAIL = 'noreply@tad.software'; // Must be verified in SES

const parseMultipart = (event) => {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({
            headers: {
                'content-type': event.headers['content-type'] || event.headers['Content-Type'],
            },
            isBase64: event.isBase64Encoded,
        });

        const result = {
            fields: {},
            files: [],
        };

        busboy.on('file', (fieldname, file, info) => {
            const { filename, mimeType } = info;
            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
                result.files.push({
                    filename,
                    contentType: mimeType,
                    content: Buffer.concat(chunks),
                });
            });
        });

        busboy.on('field', (fieldname, val) => {
            result.fields[fieldname] = val;
        });

        busboy.on('error', reject);
        busboy.on('finish', () => resolve(result));

        busboy.write(
            event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body
        );
        busboy.end();
    });
};

const celebrationImage = require('./celebration_image');

const createMimeMessage = (fields, files) => {
    const boundaryMixed = `----BoundaryMixed${Date.now().toString(16)}`;
    const boundaryRelated = `----BoundaryRelated${Date.now().toString(16)}`;
    const boundaryAlternative = `----BoundaryAlternative${Date.now().toString(16)}`;
    const nl = '\r\n';

    let body = '';

    // --- Root: Multipart/Mixed ---
    // Preamble
    body += `From: ${SOURCE_EMAIL}${nl}`;
    body += `To: ${fields.adminEmail || ADMIN_EMAIL}${nl}`;
    body += `Subject: ${fields.projectType ? `New Contact Form Submission: ${fields.projectType}` : 'New Contact Form Submission'}${nl}`;
    body += `MIME-Version: 1.0${nl}`;
    body += `Content-Type: multipart/mixed; boundary="${boundaryMixed}"${nl}${nl}`;

    // --- Part 1: Multipart/Related (Inline Image + Content) ---
    body += `--${boundaryMixed}${nl}`;
    body += `Content-Type: multipart/related; boundary="${boundaryRelated}"${nl}${nl}`;

    // --- Part 1.1: Multipart/Alternative (Text + HTML) ---
    body += `--${boundaryRelated}${nl}`;
    body += `Content-Type: multipart/alternative; boundary="${boundaryAlternative}"${nl}${nl}`;

    // Part 1.1.1: Text/Plain
    body += `--${boundaryAlternative}${nl}`;
    body += `Content-Type: text/plain; charset=UTF-8${nl}`;
    body += `Content-Transfer-Encoding: 7bit${nl}${nl}`;

    // Text Version Content
    body += `New Contact Method Submission${nl}${nl}`;
    for (const [key, value] of Object.entries(fields)) {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        body += `${label}: ${value}${nl}`;
    }
    body += nl;

    // Part 1.1.2: Text/HTML
    body += `--${boundaryAlternative}${nl}`;
    body += `Content-Type: text/html; charset=UTF-8${nl}`;
    body += `Content-Transfer-Encoding: 7bit${nl}${nl}`;

    // HTML Version Content
    const fieldRows = Object.entries(fields).map(([key, value]) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        return `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">${label}</td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #555;">${value}</td></tr>`;
    }).join('');

    body += `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; color: #333; line-height: 1.6; }
  .container { max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
  .header { background-color: #003366; padding: 20px; text-align: center; }
  .header img { max-width: 100%; height: auto; max-height: 150px; }
  .content { padding: 30px; }
  h2 { color: #003366; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  .footer { background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="cid:celebration_image" alt="New Lead Celebration" />
    </div>
    <div class="content">
      <h2>New Contact Submission!</h2>
      <p>You have received a new lead from the contact form.</p>
      <table>
        ${fieldRows}
      </table>
    </div>
    <div class="footer">
      <p>Sent from <a href="https://tad.software" style="color: #999; text-decoration: none;">tad.software</a></p>
    </div>
  </div>
</body>
</html>${nl}${nl}`;

    body += `--${boundaryAlternative}--${nl}`; // End of Alternative

    // --- Part 1.2: Inline Image (Celebration) ---
    body += `--${boundaryRelated}${nl}`;
    body += `Content-Type: image/png; name="celebration.png"${nl}`;
    body += `Content-Transfer-Encoding: base64${nl}`;
    body += `Content-ID: <celebration_image>${nl}`;
    body += `Content-Disposition: inline; filename="celebration.png"${nl}${nl}`;
    body += `${celebrationImage}${nl}`;

    body += `--${boundaryRelated}--${nl}`; // End of Related

    // --- Part 2+: Attachments ---
    files.forEach(file => {
        body += `--${boundaryMixed}${nl}`;
        body += `Content-Type: ${file.contentType}; name="${file.filename}"${nl}`;
        body += `Content-Disposition: attachment; filename="${file.filename}"${nl}`;
        body += `Content-Transfer-Encoding: base64${nl}${nl}`;
        body += `${file.content.toString('base64')}${nl}`;
    });

    body += `--${boundaryMixed}--${nl}`;

    return {
        RawMessage: {
            Data: Buffer.from(body)
        },
    };
};

const { LambdaClient, UpdateFunctionConfigurationCommand, GetFunctionConfigurationCommand } = require('@aws-sdk/client-lambda');
const lambda = new LambdaClient({ region: 'us-west-2' }); // Same region as the function

// Spam keywords derived from user screenshots and common spam patterns
const SPAM_KEYWORDS = [
    'per your request', 'access to top', 'boost your', 'first page of google',
    'domain authority', 'traffic to your site', 'view our pricing', 'marketing strategy',
    'seo', 'ranking', 'wikipedia page', 'wiki links', 'professional page'
];

const isSpam = (fields) => {
    const textToCheck = `${fields.description || ''} ${fields.projectType || ''} ${fields.message || ''}`.toLowerCase();

    // Check for keywords
    if (SPAM_KEYWORDS.some(keyword => textToCheck.includes(keyword))) {
        return true;
    }

    // Check for URL-heavy spam
    if ((textToCheck.match(/http/g) || []).length > 3) {
        return true;
    }

    return false;
};

const blockIp = async (ip, functionName) => {
    try {
        console.log(`Attempting to auto-block IP: ${ip}`);

        // 1. Get current configuration
        const getConfigCommand = new GetFunctionConfigurationCommand({
            FunctionName: functionName
        });
        const currentConfig = await lambda.send(getConfigCommand);

        // 2. Get current vars
        const currentEnvVars = currentConfig.Environment ? currentConfig.Environment.Variables : {};
        const currentBlacklistStr = currentEnvVars.BLACKLISTED_IPS || '';
        const currentBlacklist = currentBlacklistStr.split(',').map(s => s.trim()).filter(s => s);

        // 3. Add IP if not exists
        if (!currentBlacklist.includes(ip)) {
            currentBlacklist.push(ip);

            // 4. Update configuration
            const newBlacklistStr = currentBlacklist.join(',');
            const updateConfigCommand = new UpdateFunctionConfigurationCommand({
                FunctionName: functionName,
                Environment: {
                    Variables: {
                        ...currentEnvVars,
                        BLACKLISTED_IPS: newBlacklistStr
                    }
                }
            });

            await lambda.send(updateConfigCommand);
            console.log(`Successfully added ${ip} to BLACKLISTED_IPS`);
        } else {
            console.log(`IP ${ip} is already in the blacklist (env var)`);
        }

    } catch (err) {
        console.error('Failed to auto-block IP:', err);
        // Don't fail the whole request just because auto-block failed
    }
};

const BLACKLISTED_IPS = [
    // Add IPs here, e.g., '1.2.3.4'
];

exports.handler = async (event) => {
    try {
        // Extract Client IP
        const sourceIp = (event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp) ||
            (event.requestContext && event.requestContext.http && event.requestContext.http.sourceIp); // HTTP API payload format

        console.log('Client IP:', sourceIp);

        // specific IPs to block
        // Combine hardcoded list with environment variable list (comma-separated)
        const envBlacklist = process.env.BLACKLISTED_IPS ? process.env.BLACKLISTED_IPS.split(',').map(ip => ip.trim()) : [];
        const allBlacklistedIps = [...BLACKLISTED_IPS, ...envBlacklist];

        // Check if IP is blacklisted
        if (sourceIp && allBlacklistedIps.includes(sourceIp)) {
            console.log('Blocked request from blacklisted IP:', sourceIp);
            return {
                statusCode: 200, // Fake success
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify({ message: 'Email sent successfully' }),
            };
        }

        const { fields, files } = await parseMultipart(event);

        // Add Client IP to fields so it shows up in the email
        fields.clientIP = sourceIp || 'Unknown';

        // Honeypot check
        if (fields.website) {
            console.log('Honeypot caught a bot submission');
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify({ message: 'Email sent successfully' }), // Fake success
            };
        }

        // Check for Spam Content
        if (isSpam(fields)) {
            console.log('SPAM DETECTED based on content. Initiating Auto-Block.');

            // Trigger auto-block
            // NOTE: process.env.AWS_LAMBDA_FUNCTION_NAME is automatically available in Lambda
            if (sourceIp && process.env.AWS_LAMBDA_FUNCTION_NAME) {
                await blockIp(sourceIp, process.env.AWS_LAMBDA_FUNCTION_NAME);
            }

            return {
                statusCode: 200, // Fake success
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
                body: JSON.stringify({ message: 'Email sent successfully' }),
            };
        }

        const params = createMimeMessage(fields, files);
        const command = new SendRawEmailCommand(params);

        await ses.send(command);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // CORS
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ message: 'Email sent successfully' }),
        };
    } catch (err) {
        console.error('Error sending email:', err);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: 'Error processing request', error: err.message }),
        };
    }
};
