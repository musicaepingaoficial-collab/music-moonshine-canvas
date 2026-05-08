export const emailTemplate = (content: string, title: string = "Música e Pinga") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #121212;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f2f2f2;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #2a2a2a;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .header {
      padding: 40px 20px;
      text-align: center;
      background: linear-gradient(135deg, #10b981, #059669);
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: white;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .content h2 {
      color: #10b981;
      margin-top: 0;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #2a2a2a;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #10b981;
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
    }
    .link-alt {
      color: #10b981;
      word-break: break-all;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MÚSICA E PINGA</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Música e Pinga. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
`;
