# Telegram photo to production job record

The Telegram handler should capture the file ID, sender, timestamp, message ID, and a stable job reference supplied in the caption, QR code, or an explicit job-selection step. n8n then validates that reference against the active Monday.com job before downloading the image into durable job-keyed storage and writing the URL, checksum, source message ID, sender, and capture time back to the job record. The write should be idempotent so a retried Telegram update cannot attach the photo twice. If the reference is absent or ambiguous, the workflow asks the staff member to choose a job or routes the item to review—it never guesses.

