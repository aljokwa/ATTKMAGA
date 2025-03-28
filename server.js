const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword'
};

const server = http.createServer((request, response) => {
    console.log(`Request URL: ${request.url}`);
    
    // Default to index.html for root requests
    let filePath = '.' + request.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    // Get the file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    
    // Set default content type to plain text
    let contentType = 'text/plain';
    
    // Update content type based on file extension
    if (extname in MIME_TYPES) {
        contentType = MIME_TYPES[extname];
    }

    console.log(`Attempting to serve: ${filePath} as ${contentType}`);
    
    // Read and serve the file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found
                console.error(`File not found: ${filePath}`);
                const errorMessage = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>404 - File Not Found</title>
                        <style>
                            body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; }
                            .container { width: 80%; margin: 50px auto; text-align: center; }
                            h1 { color: #e74c3c; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>404 - File Not Found</h1>
                            <p>The file ${filePath} could not be found on the server.</p>
                            <p><a href="/">Return to Homepage</a></p>
                        </div>
                    </body>
                    </html>
                `;
                response.writeHead(404, { 'Content-Type': 'text/html' });
                response.end(errorMessage, 'utf-8');
            } else {
                // Server error
                console.error(`Server error: ${error.code} for file ${filePath}`);
                const errorMessage = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>500 - Server Error</title>
                        <style>
                            body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; }
                            .container { width: 80%; margin: 50px auto; text-align: center; }
                            h1 { color: #e74c3c; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>500 - Server Error</h1>
                            <p>Sorry, an error occurred: ${error.code}</p>
                            <p><a href="/">Return to Homepage</a></p>
                        </div>
                    </body>
                    </html>
                `;
                response.writeHead(500, { 'Content-Type': 'text/html' });
                response.end(errorMessage, 'utf-8');
            }
        } else {
            // Success
            console.log(`Successfully served: ${filePath}`);
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });
});

// List all files in the current directory for debugging
fs.readdir('.', (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
    } else {
        console.log('Files in current directory:');
        files.forEach(file => {
            console.log(`- ${file}`);
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Current working directory: ${process.cwd()}`);
}); 