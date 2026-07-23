# Platani Seaside Villa — deployment setup

## Booking emails

1. Create a Resend account and verify the domain that will send the emails.
2. In the Vercel project, add these Production and Preview environment variables:
   - `RESEND_API_KEY`: the Resend API key.
   - `BOOKING_TO_EMAIL`: `plataniseasidevilla@gmail.com`.
   - `BOOKING_FROM_EMAIL`: for example `Platani Seaside Villa <booking@your-verified-domain.com>`.
3. Redeploy the project after adding or changing environment variables.
4. Submit the form on the deployed `/hosts.html#book-now` page and check both the inbox and spam folder.

For a temporary Resend test, use its test sender only as documented in the Resend dashboard. A verified custom domain is required for production delivery.

## Analytics

Enable Web Analytics in the Vercel project's Analytics tab. The tracking script is already present on every page and begins collecting data after deployment.

## URLs

The correct page is `/accommodation.html`. Vercel permanently redirects the previous misspelled `/accomndation.html` URL so existing bookmarks continue to work.
