export function uploadFileToGoogleDrive(uploadUrl: string, file: File, onProgress: (percentage: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    request.addEventListener('load', () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Google Drive upload failed (${request.status}).`));
        return;
      }
      resolve();
    });
    // Drive can commit the file while preventing the browser from reading the
    // final response through CORS. The server verifies the pre-generated ID.
    request.addEventListener('error', () => resolve());
    request.addEventListener('abort', () => reject(new Error('Upload dibatalkan.')));
    request.send(file);
  });
}
